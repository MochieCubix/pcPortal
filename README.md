# AWS Textract Document Processor

A Next.js application that processes PDF documents using AWS Textract, incorporates human review with Amazon A2I when needed, and leverages SageMaker for continuous model improvement.

## Features

- PDF upload and processing with AWS Textract
- Extracts text, forms (key-value pairs), and tables from documents
- Confidence scoring for extracted fields
- Automatic human review via Amazon A2I when confidence is below 80%
- Storage of results in DynamoDB
- SageMaker model training for continuous improvement
- Modern UI with Tailwind CSS

## Prerequisites

- Node.js 14+ and npm
- AWS account with appropriate permissions
- Configured S3 bucket
- Amazon A2I flow definition (for human review)
- DynamoDB table
- IAM roles for SageMaker

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/aws-textract-processor.git
   cd aws-textract-processor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables example file and fill in your AWS details:
   ```bash
   cp .env.local.example .env.local
   ```

4. Edit `.env.local` with your AWS credentials and configuration.

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000/textract](http://localhost:3000/textract) in your browser.

## AWS Setup Requirements

### S3 Bucket
- Create an S3 bucket for storing uploaded files
- Ensure CORS is properly configured for web uploads
- Set up appropriate bucket policy

### IAM Permissions
The AWS user needs permissions for:
- S3 (PutObject, GetObject)
- Textract (StartDocumentAnalysis, GetDocumentAnalysis)
- Amazon A2I / Augmented AI Runtime
- DynamoDB (PutItem)
- SageMaker (CreateTrainingJob)

### DynamoDB
- Create a table named `textract-results` (or update the name in code)
- Primary key: `fileId` (String)
- Sort key: `timestamp` (String)

### Amazon A2I
- Set up a workforce (private/vendor/mechanical turk)
- Create a worker task template
- Create a flow definition and note the ARN

### SageMaker
- Create an IAM role for SageMaker with appropriate permissions
- Note the role ARN for the `.env.local` file

## Usage

1. Navigate to the `/textract` page
2. Upload a PDF timesheet or document
3. The system will process the document with AWS Textract
4. Results will display with confidence scores
5. If confidence is low for key fields, human review will be triggered
6. After human review, you can reprocess the document
7. Use the SageMaker training button to improve the model with corrected data

## Environment Variables

- `AWS_REGION`: AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
- `S3_BUCKET_NAME`: Your S3 bucket name
- `HUMAN_LOOP_FLOW_DEFINITION_ARN`: ARN for your A2I flow definition
- `SAGEMAKER_ROLE_ARN`: ARN for the SageMaker execution role
- `DYNAMODB_TABLE_NAME`: Name of your DynamoDB table

## License

[MIT](LICENSE) 