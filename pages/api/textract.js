import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { 
  TextractClient, 
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand
} from "@aws-sdk/client-textract";
import { 
  AugmentedAIRuntimeClient, 
  StartHumanLoopCommand 
} from "@aws-sdk/client-augmented-ai-runtime";
import { 
  DynamoDBClient, 
  PutItemCommand 
} from "@aws-sdk/client-dynamodb";
import { 
  SageMakerClient, 
  CreateTrainingJobCommand 
} from "@aws-sdk/client-sagemaker";

import { IncomingForm } from 'formidable';
import { createReadStream, readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS
const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.S3_BUCKET_NAME || 'your-bucket-name';
const humanLoopFlowDefinitionArn = process.env.HUMAN_LOOP_FLOW_DEFINITION_ARN;
const dynamoTable = process.env.DYNAMODB_TABLE_NAME || 'textract-results';

// Initialize AWS clients
const s3Client = new S3Client({ region });
const textractClient = new TextractClient({ region });
const a2iClient = new AugmentedAIRuntimeClient({ region });
const dynamoClient = new DynamoDBClient({ region });
const sagemakerClient = new SageMakerClient({ region });

// Disable body parsing, we'll handle the form data ourselves
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, please use POST' });
  }

  try {
    // Parse form data
    const { fields, files } = await parseForm(req);
    
    // Handle different actions
    switch (fields.action) {
      case 'upload':
        return await handleFileUpload(files, res);
      case 'sagemaker-train':
        return await triggerSageMakerTraining(fields, res);
      default:
        return await handleFileUpload(files, res);
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to process the request', details: error.message });
  }
}

async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      keepExtensions: true,
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

async function handleFileUpload(files, res) {
  if (!files || !files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const file = files.file;
    const fileContent = readFileSync(file.filepath);
    const fileId = uuidv4();
    const s3Key = `uploads/${fileId}-${file.originalFilename}`;
    
    // 1. Upload to S3
    await uploadToS3(fileContent, s3Key);
    
    // 2. Start Textract job
    const textractJobId = await startTextractJob(s3Key);
    
    // 3. Get Textract results (poll until complete)
    const textractResults = await pollTextractResults(textractJobId);
    
    // 4. Process results and check confidence
    const { extractedData, requiresHumanReview } = processTextractResults(textractResults);
    
    // 5. Start human review if needed
    let humanReviewUrl = null;
    let finalData = extractedData;
    
    if (requiresHumanReview) {
      const humanLoopName = `human-loop-${fileId}`;
      humanReviewUrl = await startHumanReview(s3Key, textractResults, humanLoopName);
      
      // Store initial data with human review pending status
      await storeInDynamoDB(fileId, finalData, 'REVIEW_PENDING', s3Key, humanLoopName);
      
      return res.status(200).json({ 
        fileId,
        extractedData: finalData, 
        requiresHumanReview: true,
        humanReviewUrl,
        message: 'Document requires human review for better accuracy' 
      });
    }
    
    // 6. Store results in DynamoDB
    await storeInDynamoDB(fileId, finalData, 'COMPLETED', s3Key);
    
    // 7. Return the results
    return res.status(200).json({
      fileId,
      extractedData: finalData,
      requiresHumanReview: false,
      message: 'Document processed successfully'
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({ error: 'Failed to process document', details: error.message });
  }
}

async function uploadToS3(fileContent, s3Key) {
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
    }));
    console.log(`File uploaded to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

async function startTextractJob(s3Key) {
  try {
    const params = {
      DocumentLocation: {
        S3Object: {
          Bucket: bucketName,
          Name: s3Key,
        },
      },
      FeatureTypes: ['TABLES', 'FORMS'],
    };
    
    const command = new StartDocumentAnalysisCommand(params);
    const response = await textractClient.send(command);
    
    console.log(`Textract job started: ${response.JobId}`);
    return response.JobId;
  } catch (error) {
    console.error('Textract job start error:', error);
    throw new Error(`Failed to start Textract job: ${error.message}`);
  }
}

async function pollTextractResults(jobId) {
  try {
    let finished = false;
    let results = null;
    
    while (!finished) {
      const params = {
        JobId: jobId,
      };
      
      const command = new GetDocumentAnalysisCommand(params);
      const response = await textractClient.send(command);
      
      if (['SUCCEEDED', 'FAILED', 'ERROR'].includes(response.JobStatus)) {
        finished = true;
        results = response;
      } else {
        // Wait 2 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (results.JobStatus !== 'SUCCEEDED') {
      throw new Error(`Textract job failed with status: ${results.JobStatus}`);
    }
    
    console.log('Textract job completed successfully');
    return results;
  } catch (error) {
    console.error('Textract results polling error:', error);
    throw new Error(`Failed to get Textract results: ${error.message}`);
  }
}

function processTextractResults(textractResults) {
  try {
    // Extract key-value pairs from the forms
    const keyValuePairs = {};
    const confidenceScores = {};
    let requiresHumanReview = false;
    
    // Key fields we care about - these are what we check for confidence thresholds
    const keyFields = ['Start', 'Finish', 'Total Hours'];
    
    // Process all blocks
    textractResults.Blocks.forEach(block => {
      if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes.includes('KEY')) {
        // This is a key in a key-value pair
        const keyText = getTextFromBlock(block.Id, textractResults.Blocks);
        const valueId = block.Relationships?.find(r => r.Type === 'VALUE')?.Ids[0];
        
        if (valueId) {
          const valueBlock = textractResults.Blocks.find(b => b.Id === valueId);
          const valueText = getTextFromBlock(valueId, textractResults.Blocks);
          const confidence = valueBlock.Confidence;
          
          keyValuePairs[keyText] = valueText;
          confidenceScores[keyText] = confidence;
          
          // Check if this is a key field with low confidence
          if (keyFields.includes(keyText) && confidence < 80) {
            requiresHumanReview = true;
          }
        }
      }
    });
    
    // Process tables
    const tables = processTextractTables(textractResults.Blocks);
    
    // Combine everything into our extracted data object
    const extractedData = {
      keyValuePairs,
      confidenceScores,
      tables
    };
    
    return { extractedData, requiresHumanReview };
  } catch (error) {
    console.error('Textract results processing error:', error);
    throw new Error(`Failed to process Textract results: ${error.message}`);
  }
}

function getTextFromBlock(blockId, blocks) {
  const block = blocks.find(b => b.Id === blockId);
  
  if (block.BlockType === 'WORD') {
    return block.Text;
  } else if (block.Relationships && block.Relationships.some(r => r.Type === 'CHILD')) {
    const childIds = block.Relationships.find(r => r.Type === 'CHILD').Ids;
    return childIds.map(id => {
      const childBlock = blocks.find(b => b.Id === id);
      return childBlock.Text;
    }).join(' ');
  }
  
  return '';
}

function processTextractTables(blocks) {
  const tables = [];
  const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');
  
  tableBlocks.forEach(tableBlock => {
    const tableRows = [];
    const cellsById = {};
    
    // Identify all the cells in this table
    blocks.forEach(block => {
      if (block.BlockType === 'CELL' && block.RowIndex !== undefined && block.ColumnIndex !== undefined) {
        if (!cellsById[block.Id]) {
          cellsById[block.Id] = {
            rowIndex: block.RowIndex,
            columnIndex: block.ColumnIndex,
            text: '',
            confidence: block.Confidence
          };
        }
        
        // Get cell text
        if (block.Relationships && block.Relationships.some(r => r.Type === 'CHILD')) {
          const childIds = block.Relationships.find(r => r.Type === 'CHILD').Ids;
          const text = childIds.map(id => {
            const childBlock = blocks.find(b => b.Id === id);
            return childBlock.Text || '';
          }).join(' ');
          
          cellsById[block.Id].text = text;
        }
      }
    });
    
    // Create a grid representation of the table
    const grid = [];
    Object.values(cellsById).forEach(cell => {
      if (!grid[cell.rowIndex - 1]) {
        grid[cell.rowIndex - 1] = [];
      }
      grid[cell.rowIndex - 1][cell.columnIndex - 1] = cell;
    });
    
    tables.push(grid);
  });
  
  return tables;
}

async function startHumanReview(s3Key, textractResults, humanLoopName) {
  if (!humanLoopFlowDefinitionArn) {
    console.warn('Human review skipped - no flow definition ARN provided');
    return null;
  }
  
  try {
    const params = {
      FlowDefinitionArn: humanLoopFlowDefinitionArn,
      HumanLoopName: humanLoopName,
      DataAttributes: {
        ContentClassifiers: ["FreeOfPersonallyIdentifiableInformation", "FreeOfAdultContent"]
      },
      HumanLoopInput: {
        InputContent: JSON.stringify({
          initialValue: textractResults,
          taskObject: {
            s3Key: s3Key,
            bucketName: bucketName
          }
        })
      }
    };
    
    const command = new StartHumanLoopCommand(params);
    const response = await a2iClient.send(command);
    
    console.log(`Human review started: ${humanLoopName}`);
    return `https://console.aws.amazon.com/a2i/home?region=${region}#/human-loops/${humanLoopName}`;
  } catch (error) {
    console.error('Human review start error:', error);
    throw new Error(`Failed to start human review: ${error.message}`);
  }
}

async function storeInDynamoDB(fileId, data, status, s3Key, humanLoopName = null) {
  try {
    const timestamp = new Date().toISOString();
    
    const item = {
      fileId: { S: fileId },
      timestamp: { S: timestamp },
      s3Key: { S: s3Key },
      status: { S: status },
      data: { S: JSON.stringify(data) }
    };
    
    if (humanLoopName) {
      item.humanLoopName = { S: humanLoopName };
    }
    
    const params = {
      TableName: dynamoTable,
      Item: item
    };
    
    const command = new PutItemCommand(params);
    await dynamoClient.send(command);
    
    console.log(`Data stored in DynamoDB: ${fileId}`);
    return fileId;
  } catch (error) {
    console.error('DynamoDB storage error:', error);
    throw new Error(`Failed to store in DynamoDB: ${error.message}`);
  }
}

async function triggerSageMakerTraining(fields, res) {
  try {
    const modelName = `textract-model-${new Date().getTime()}`;
    
    const params = {
      AlgorithmSpecification: {
        TrainingImage: "763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:1.8.1-gpu-py36-cu111-ubuntu18.04",
        TrainingInputMode: "File"
      },
      HyperParameters: {
        "epochs": "10",
        "batch-size": "32",
        "learning-rate": "0.001"
      },
      InputDataConfig: [
        {
          ChannelName: "training",
          DataSource: {
            S3DataSource: {
              S3DataType: "S3Prefix",
              S3Uri: `s3://${bucketName}/training-data/`,
              S3DataDistributionType: "FullyReplicated"
            }
          },
          ContentType: "application/json"
        }
      ],
      OutputDataConfig: {
        S3OutputPath: `s3://${bucketName}/models/`
      },
      ResourceConfig: {
        InstanceCount: 1,
        InstanceType: "ml.m5.large",
        VolumeSizeInGB: 50
      },
      RoleArn: process.env.SAGEMAKER_ROLE_ARN,
      StoppingCondition: {
        MaxRuntimeInSeconds: 3600
      },
      TrainingJobName: modelName
    };
    
    const command = new CreateTrainingJobCommand(params);
    const response = await sagemakerClient.send(command);
    
    console.log(`SageMaker training job started: ${modelName}`);
    return res.status(200).json({
      message: 'SageMaker training job started successfully',
      trainingJobName: modelName,
      trainingJobArn: response.TrainingJobArn
    });
  } catch (error) {
    console.error('SageMaker training error:', error);
    return res.status(500).json({ error: 'Failed to start SageMaker training', details: error.message });
  }
} 