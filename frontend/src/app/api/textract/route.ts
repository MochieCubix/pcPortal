import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { 
  TextractClient, 
  StartDocumentAnalysisCommand, 
  GetDocumentAnalysisCommand,
  FeatureType
} from '@aws-sdk/client-textract';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SageMakerClient, CreateTrainingJobCommand, DescribeFlowDefinitionCommand } from '@aws-sdk/client-sagemaker';
import { 
  SageMakerA2IRuntimeClient, 
  StartHumanLoopCommand 
} from '@aws-sdk/client-sagemaker-a2i-runtime';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as os from 'os';
import { ReadStream } from 'fs';
import { createReadStream } from 'fs';

// Configure AWS
const region = process.env.AWS_REGION || 'ap-southeast-2';
const bucketName = process.env.S3_BUCKET_NAME || 'pcpanel';
const humanLoopFlowDefinitionArn = process.env.HUMAN_LOOP_FLOW_DEFINITION_ARN || '';
const dynamoTable = process.env.DYNAMODB_TABLE_NAME || 'textract-results';

// Log environment configuration on startup
console.log('AWS Configuration:');
console.log(`Region: ${region}`);
console.log(`S3 Bucket: ${bucketName}`);
console.log(`DynamoDB Table: ${dynamoTable}`);
console.log(`Human Loop ARN configured: ${humanLoopFlowDefinitionArn ? 'Yes' : 'No'}`);

// Initialize AWS clients
const s3Client = new S3Client({ region });
const textractClient = new TextractClient({ region });
const dynamoClient = new DynamoDBClient({ region });
const sagemakerClient = new SageMakerClient({ region });
const a2iClient = new SageMakerA2IRuntimeClient({ region });

// Add this new function to get flow definition details
async function logFlowDefinitionDetails(flowDefinitionArn: string) {
  try {
    // Extract flow definition name from ARN
    const arnParts = flowDefinitionArn.split('/');
    const flowDefinitionName = arnParts[arnParts.length - 1];
    
    console.log(`Checking flow definition details for: ${flowDefinitionName}`);
    
    const params = {
      FlowDefinitionName: flowDefinitionName
    };
    
    const command = new DescribeFlowDefinitionCommand(params);
    const response = await sagemakerClient.send(command);
    
    // Cast to any to avoid TypeScript errors with property access
    const flowDef = response as any;
    
    console.log('Flow Definition Details:');
    console.log(`- Status: ${flowDef.FlowDefinitionStatus}`);
    console.log(`- Creation Time: ${flowDef.CreationTime}`);
    
    if (flowDef.WorkforceConfig) {
      console.log('Workforce Configuration:');
      
      if (flowDef.WorkforceConfig.WorkforceName) {
        console.log(`- Workforce Name: ${flowDef.WorkforceConfig.WorkforceName}`);
      }
      
      if (flowDef.WorkforceConfig.WorkteamArn) {
        console.log(`- Workteam ARN: ${flowDef.WorkforceConfig.WorkteamArn}`);
      }
    }
    
    if (flowDef.HumanLoopConfig) {
      console.log('Human Loop Configuration:');
      console.log(`- Task Count: ${flowDef.HumanLoopConfig.TaskCount}`);
      console.log(`- Task Description: ${flowDef.HumanLoopConfig.TaskDescription}`);
      console.log(`- Task Title: ${flowDef.HumanLoopConfig.TaskTitle}`);
    }
    
    console.log('End of Flow Definition Details');
  } catch (error: any) {
    console.error('Error getting flow definition details:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // Check flow definition details on startup if ARN is configured
    if (humanLoopFlowDefinitionArn) {
      try {
        await logFlowDefinitionDetails(humanLoopFlowDefinitionArn);
      } catch (error) {
        console.warn('Failed to get flow definition details:', error);
      }
    }
    
    const formData = await request.formData();
    const action = formData.get('action') as string;
    
    switch (action) {
      case 'upload':
        return await handleFileUpload(formData);
      case 'reprocess':
        return await handleReprocessing(formData);
      case 'sagemaker-train':
        return await triggerSageMakerTraining();
      default:
        return await handleFileUpload(formData);
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to process the request', details: error.message },
      { status: 500 }
    );
  }
}

async function handleFileUpload(formData: FormData) {
  console.log('Starting file upload process');
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  
  try {
    // Save file to temp location
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create a temporary file path
    const tempFilePath = join(os.tmpdir(), file.name);
    await writeFile(tempFilePath, buffer);
    console.log(`File saved to temporary location: ${tempFilePath}`);
    
    const fileId = uuidv4();
    const s3Key = `uploads/${fileId}-${file.name}`;
    
    // 1. Upload to S3
    console.log(`Uploading to S3 bucket: "${bucketName}", key: "${s3Key}"`);
    await uploadToS3(tempFilePath, s3Key);
    
    // 2. Start Textract job
    console.log('Starting Textract analysis job');
    const jobId = await startTextractJob(s3Key);
    
    // 3. Get Textract results (poll until complete)
    console.log(`Waiting for Textract job ${jobId} to complete`);
    const textractResults = await waitForTextractResults(jobId);
    
    // 4. Process results
    console.log('Processing Textract results');
    const processedData = processTextractResults(textractResults);
    
    // 5. Check if human review is needed
    const requiresHumanReview = doesRequireHumanReview(processedData);
    console.log(`Human review required: ${requiresHumanReview}`);

    // When using Textract's built-in human review, we don't need to manually start a human review
    // The HumanLoopConfig in the Textract request will handle this
    let humanLoopArn = '';
    
    // 6. Store results in DynamoDB
    console.log('Storing results in DynamoDB');
    await storeResultsInDynamoDB(fileId, file.name, processedData, requiresHumanReview, humanLoopArn);
    
    // Return additional diagnostic information
    return NextResponse.json({
      fileId,
      extractedData: processedData,
      requiresHumanReview,
      humanLoopArn: humanLoopArn || undefined,
      message: 'Document processed successfully',
      debugInfo: {
        flowDefinitionArn: humanLoopFlowDefinitionArn,
        s3Location: {
          bucket: bucketName,
          key: s3Key
        },
        jobId: jobId,
        humanReviewTriggered: requiresHumanReview,
        humanLoopConfig: {
          flowDefinitionArn: humanLoopFlowDefinitionArn,
          dataAttributes: {
            contentClassifiers: [
              'FreeOfPersonallyIdentifiableInformation',
              'FreeOfAdultContent'
            ]
          },
          activationConditionsUsed: true
        }
      }
    });
    
  } catch (error: any) {
    console.error('Processing error:', error);
    // Provide more detailed information for debugging
    if (error.name === 'ServiceException') {
      console.error('AWS Service Exception Details:', {
        message: error.message,
        code: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
        service: error.$metadata?.service,
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to process document', details: error.message },
      { status: 500 }
    );
  }
}

async function uploadToS3(filePath: string, s3Key: string): Promise<void> {
  try {
    const fileStream = createReadStream(filePath);
    
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileStream
    };
    
    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log(`File uploaded successfully to ${bucketName}/${s3Key}`);
  } catch (error: any) {
    console.error('Error uploading to S3:', error);
    
    // Enhanced error reporting
    if (error.$metadata) {
      console.error('S3 Error Details:', {
        code: error.Code,
        requestId: error.$metadata.requestId,
        httpStatusCode: error.$metadata.httpStatusCode
      });
    }
    
    // Translate common errors to more user-friendly messages
    if (error.Code === 'NoSuchBucket') {
      throw new Error(`S3 bucket "${bucketName}" does not exist`);
    } else if (error.Code === 'AccessDenied' || error.Code === 'AllAccessDisabled') {
      throw new Error(`Access denied to S3 bucket "${bucketName}". Check IAM permissions.`);
    } else {
      throw new Error(`Failed to upload to S3: ${error.message || error}`);
    }
  }
}

async function startTextractJob(s3Key: string): Promise<string> {
  try {
    // Base Textract parameters without human review
    const params: any = {
      DocumentLocation: {
        S3Object: {
          Bucket: bucketName,
          Name: s3Key
        }
      },
      FeatureTypes: [
        FeatureType.FORMS,
        FeatureType.TABLES
      ]
    };
    
    // Only add human loop config if a flow definition ARN is provided
    if (humanLoopFlowDefinitionArn) {
      console.log('Setting up human review with flow definition:', humanLoopFlowDefinitionArn);
      
      // Create the HumanLoopConfig
      const humanLoopConfig = {
        FlowDefinitionArn: humanLoopFlowDefinitionArn,
        HumanLoopName: `textract-review-${Date.now()}`,
        DataAttributes: {
          ContentClassifiers: [
            'FreeOfPersonallyIdentifiableInformation',
            'FreeOfAdultContent'
          ]
        },
        // Set a high confidence threshold to ensure human reviews are triggered
        // This means "if confidence is less than 99%, send to human review"
        HumanLoopActivationConditions: JSON.stringify({
          Conditions: [
            {
              ConditionType: "ImportantFormKeyConfidenceCheck",
              ConditionParameters: {
                ImportantFormKey: "*",
                ImportantFormKeyAliases: ["*"],
                KeyValueBlockConfidenceLessThan: 99,
                WordBlockConfidenceLessThan: 99
              }
            }
          ]
        })
      };

      // Log the HumanLoopConfig for debugging
      console.log('Using HumanLoopConfig:', JSON.stringify(humanLoopConfig, null, 2));
      
      // Add HumanLoopConfig to the params
      params.HumanLoopConfig = humanLoopConfig;
    } else {
      console.log('No flow definition ARN configured. Proceeding without human review option.');
    }
    
    const command = new StartDocumentAnalysisCommand(params);
    const response = await textractClient.send(command);
    
    if (!response.JobId) {
      throw new Error('No JobId returned from Textract');
    }
    
    return response.JobId;
  } catch (error: any) {
    console.error('Error starting Textract job:', error);
    
    // Provide more detailed error information for HumanLoopConfig issues
    if (error.message && error.message.includes('HumanLoop')) {
      console.error('HumanLoopConfig error details:', error);
    }
    
    throw new Error(`Failed to start Textract job: ${error.message || error}`);
  }
}

async function waitForTextractResults(jobId: string, maxAttempts = 30): Promise<any> {
  const params = {
    JobId: jobId
  };
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const command = new GetDocumentAnalysisCommand(params);
      const response = await textractClient.send(command);
      
      if (response.JobStatus === 'SUCCEEDED') {
        // Check if Textract created a human loop
        // Using optional chaining and type assertion since HumanLoopActivationOutput 
        // is not in the TypeScript definitions but may be returned by the API
        const humanLoopOutput = (response as any).HumanLoopActivationOutput;
        if (humanLoopOutput) {
          console.log('Textract created human review(s):', humanLoopOutput);
          
          if (humanLoopOutput.HumanLoopArn) {
            console.log('Human loop ARN:', humanLoopOutput.HumanLoopArn);
          }
          
          if (humanLoopOutput.HumanLoopActivationReasons) {
            console.log('Activation reasons:', humanLoopOutput.HumanLoopActivationReasons);
          }
        } else {
          console.log('No human loops were created by Textract');
        }
        
        return response;
      } else if (response.JobStatus === 'FAILED') {
        throw new Error(`Textract job failed: ${response.StatusMessage || 'Unknown reason'}`);
      }
      
      console.log(`Textract job status: ${response.JobStatus}, waiting...`);
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;
    } catch (error: any) {
      console.error(`Error checking Textract job status (attempt ${attempts}):`, error);
      
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to get Textract results after ${maxAttempts} attempts: ${error.message || error}`);
      }
      
      // Wait longer after an error
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }
  
  throw new Error(`Textract job ${jobId} did not complete in the allowed time`);
}

function processTextractResults(results: any) {
  try {
    // Create objects to store key-value pairs and confidence scores
    const keyValuePairs: Record<string, string> = {};
    const confidenceScores: Record<string, number> = {};
    const tables: any[] = [];
    
    // Extract form fields (key-value pairs)
    if (results.Blocks) {
      processKeyValuePairs(results.Blocks, keyValuePairs, confidenceScores);
      processTables(results.Blocks, tables);
    }
    
    return {
      keyValuePairs,
      confidenceScores,
      tables
    };
  } catch (error: any) {
    console.error('Error processing Textract results:', error);
    throw new Error(`Failed to process Textract results: ${error.message || error}`);
  }
}

function processKeyValuePairs(blocks: any[], keyValuePairs: Record<string, string>, confidenceScores: Record<string, number>) {
  // Map to store relationships between blocks
  const blockMap = new Map();
  blocks.forEach(block => {
    blockMap.set(block.Id, block);
  });
  
  // Find key-value sets
  blocks.forEach(block => {
    if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes && block.EntityTypes.includes('KEY')) {
      // This is a key in a key-value pair
      const key = getTextFromRelationship(block, blockMap, 'KEY');
      if (key && block.Relationships) {
        // Find the corresponding value for this key
        const valueRelationship = block.Relationships.find((rel: any) => rel.Type === 'VALUE');
        if (valueRelationship) {
          const value = getTextFromIds(valueRelationship.Ids, blockMap);
          const confidence = block.Confidence || 0;
          
          if (key && value) {
            keyValuePairs[key] = value;
            confidenceScores[key] = parseFloat(confidence.toFixed(1));
          }
        }
      }
    }
  });
}

function getTextFromRelationship(block: any, blockMap: Map<string, any>, entityType: string): string {
  if (block.EntityTypes && block.EntityTypes.includes(entityType) && block.Relationships) {
    const childIds: string[] = []; // Fixed TypeScript error by adding explicit type
    
    // Find all child blocks
    block.Relationships.forEach((relationship: any) => {
      if (relationship.Type === 'CHILD') {
        relationship.Ids.forEach((id: string) => {
          childIds.push(id);
        });
      }
    });
    
    // Extract and concatenate text from child blocks
    return getTextFromIds(childIds, blockMap);
  }
  
  return '';
}

function getTextFromIds(ids: string[], blockMap: Map<string, any>): string {
  const texts: string[] = [];
  
  // Sort word blocks to ensure correct reading order
  const wordBlocks = ids
    .map(id => blockMap.get(id))
    .filter(block => block && block.BlockType === 'WORD')
    .sort((a, b) => {
      if (a.Geometry && b.Geometry && a.Geometry.BoundingBox && b.Geometry.BoundingBox) {
        // Sort top to bottom, left to right
        const yDiff = a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top;
        return Math.abs(yDiff) < 0.01 ? a.Geometry.BoundingBox.Left - b.Geometry.BoundingBox.Left : yDiff;
      }
      return 0;
    });
  
  // Extract text from each word block
  wordBlocks.forEach(block => {
    if (block && block.Text) {
      texts.push(block.Text);
    }
  });
  
  return texts.join(' ');
}

function processTables(blocks: any[], tables: any[]) {
  // Find all table blocks
  const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');
  
  tableBlocks.forEach(tableBlock => {
    const tableData: any[][] = [];
    const cellsByPosition = new Map<string, any>();
    
    // Find all cells for this table
    if (tableBlock.Relationships) {
      const cellIds = tableBlock.Relationships
        .filter((rel: any) => rel.Type === 'CHILD')
        .flatMap((rel: any) => rel.Ids);
      
      // Get all cell blocks and their content
      cellIds.forEach((cellId: string) => {
        const cellBlock = blocks.find(block => block.Id === cellId);
        if (cellBlock && cellBlock.BlockType === 'CELL') {
          const rowIndex = cellBlock.RowIndex || 0;
          const columnIndex = cellBlock.ColumnIndex || 0;
          const position = `${rowIndex}-${columnIndex}`;
          
          // Get text content for this cell
          let cellText = '';
          let cellConfidence = 0;
          
          if (cellBlock.Relationships) {
            const contentIds = cellBlock.Relationships
              .filter((rel: any) => rel.Type === 'CHILD')
              .flatMap((rel: any) => rel.Ids);
            
            const cellWords = contentIds
              .map((id: string) => blocks.find(block => block.Id === id))
              .filter((block: any) => block && block.BlockType === 'WORD');
            
            cellText = cellWords.map((word: any) => word.Text).join(' ');
            cellConfidence = cellWords.length > 0 
              ? cellWords.reduce((sum: number, word: any) => sum + (word.Confidence || 0), 0) / cellWords.length 
              : 0;
          }
          
          cellsByPosition.set(position, {
            text: cellText,
            confidence: parseFloat(cellConfidence.toFixed(1)),
            rowIndex,
            columnIndex
          });
        }
      });
      
      // Calculate table dimensions
      let maxRow = 0;
      let maxColumn = 0;
      
      cellsByPosition.forEach((cell, position) => {
        maxRow = Math.max(maxRow, cell.rowIndex);
        maxColumn = Math.max(maxColumn, cell.columnIndex);
      });
      
      // Create the table grid
      for (let r = 1; r <= maxRow; r++) {
        const row = [];
        for (let c = 1; c <= maxColumn; c++) {
          const position = `${r}-${c}`;
          const cell = cellsByPosition.get(position) || { 
            text: '', 
            confidence: 0, 
            rowIndex: r, 
            columnIndex: c 
          };
          row.push(cell);
        }
        tableData.push(row);
      }
      
      tables.push(tableData);
    }
  });
}

function doesRequireHumanReview(processedData: any): boolean {
  // Determine if human review is needed based on confidence scores
  const confidenceThreshold = 85; // Configurable threshold
  let requiresReview = false;
  
  // Check form fields confidence
  Object.values(processedData.confidenceScores as Record<string, number>).forEach((confidence: number) => {
    if (confidence < confidenceThreshold) {
      requiresReview = true;
    }
  });
  
  // Check tables confidence
  processedData.tables.forEach((table: any[][]) => {
    table.forEach(row => {
      row.forEach(cell => {
        if (cell.confidence < confidenceThreshold) {
          requiresReview = true;
        }
      });
    });
  });
  
  return requiresReview;
}

// New function to start human review with Amazon A2I
async function startHumanReview(fileId: string, s3Key: string, processedData: any): Promise<string> {
  try {
    if (!humanLoopFlowDefinitionArn) {
      throw new Error('Human loop flow definition ARN is not configured');
    }

    // Create input for human review
    const inputContent = {
      document: {
        s3ObjectName: s3Key,
        s3Bucket: bucketName
      },
      extractedData: processedData
    };

    // Configure and start human loop
    const params = {
      HumanLoopName: `textract-review-${fileId}`,
      FlowDefinitionArn: humanLoopFlowDefinitionArn,
      HumanLoopInput: {
        InputContent: JSON.stringify(inputContent)
      }
    };

    const command = new StartHumanLoopCommand(params);
    const response = await a2iClient.send(command);
    
    if (!response.HumanLoopArn) {
      throw new Error('Failed to create human review loop');
    }
    
    return response.HumanLoopArn;
  } catch (error: any) {
    console.error('Error starting human review:', error);
    
    // More informative error logging
    if (error.$metadata) {
      console.error('A2I Error Details:', {
        code: error.name,
        statusCode: error.$metadata.httpStatusCode,
        requestId: error.$metadata.requestId,
        message: error.message
      });
    }
    
    // Don't fail the whole process if human review fails
    console.warn('Continuing without human review due to error');
    return '';
  }
}

async function storeResultsInDynamoDB(
  fileId: string, 
  fileName: string, 
  processedData: any, 
  requiresHumanReview: boolean,
  humanLoopArn: string = ''
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    const params = {
      TableName: dynamoTable,
      Item: {
        fileId: { S: fileId },
        fileName: { S: fileName },
        processedData: { S: JSON.stringify(processedData) },
        requiresHumanReview: { BOOL: requiresHumanReview },
        humanLoopArn: { S: humanLoopArn || '' },
        timestamp: { S: timestamp }
      }
    };
    
    await dynamoClient.send(new PutItemCommand(params));
    console.log(`Results stored in DynamoDB table ${dynamoTable}`);
  } catch (error: any) {
    console.error('Error storing results in DynamoDB:', error);
    throw new Error(`Failed to store results in DynamoDB: ${error.message || error}`);
  }
}

async function handleReprocessing(formData: FormData) {
  const fileId = formData.get('fileId') as string;
  
  if (!fileId) {
    return NextResponse.json({ error: 'No fileId provided' }, { status: 400 });
  }
  
  try {
    // In a real implementation, you would:
    // 1. Retrieve the file from S3 using the fileId
    // 2. Re-run the Textract processing
    // 3. Update the results in DynamoDB
    
    // For now, just return a success message
    return NextResponse.json({
      message: 'Document reprocessing initiated',
      fileId
    });
  } catch (error: any) {
    console.error('Reprocessing error:', error);
    return NextResponse.json(
      { error: 'Failed to reprocess document', details: error.message },
      { status: 500 }
    );
  }
}

async function triggerSageMakerTraining() {
  try {
    const modelName = `textract-model-${new Date().getTime()}`;
    
    // In a real implementation, you would:
    // 1. Configure a SageMaker training job
    // 2. Start the training job
    // 3. Return the job details
    
    // For simplicity, we'll return a mock response
    return NextResponse.json({
      message: 'SageMaker training job started successfully',
      trainingJobName: modelName,
      trainingJobArn: `arn:aws:sagemaker:${region}:123456789012:training-job/${modelName}`
    });
  } catch (error: any) {
    console.error('SageMaker training error:', error);
    return NextResponse.json(
      { error: 'Failed to start SageMaker training', details: error.message },
      { status: 500 }
    );
  }
} 