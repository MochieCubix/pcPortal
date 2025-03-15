# AWS S3 and SES Configuration Guide

This guide explains how to set up AWS S3 for invoice storage and AWS SES for sending emails in your application.

## Prerequisites

- An AWS account
- AWS CLI installed locally (optional, for testing)
- Basic understanding of AWS IAM policies

## Environment Variables Configuration

Create a `.env.local` file in the root of your frontend directory with the following variables:

```
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=ap-southeast-2
NEXT_PUBLIC_S3_INVOICE_BUCKET=pcpanel
NEXT_PUBLIC_SES_FROM_EMAIL=your-verified-email@yourdomain.com

# AWS Credentials (for local development only)
# AWS_ACCESS_KEY_ID=your_access_key_id
# AWS_SECRET_ACCESS_KEY=your_secret_access_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Important**: Never commit your AWS credentials to version control. The above credentials should only be used for local development.

## AWS S3 Configuration

### 1. Set up S3 Bucket CORS

You need to configure CORS for your S3 bucket to allow browser uploads:

1. Go to the AWS S3 Console
2. Select your bucket (`pcpanel`)
3. Go to the "Permissions" tab
4. Scroll down to "Cross-origin resource sharing (CORS)"
5. Add the following CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

Replace `https://yourdomain.com` with your actual domain.

### 2. Set up IAM Permissions for S3

Create a policy that allows the necessary S3 operations:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::pcpanel",
        "arn:aws:s3:::pcpanel/*"
      ]
    }
  ]
}
```

## AWS SES Configuration

### 1. Verify Email Addresses or Domain

SES requires verification of sender emails or domains:

1. Go to the AWS SES Console
2. Go to "Verified identities"
3. Click "Create identity"
4. Choose to verify an email address or a domain
5. Follow the verification steps

### 2. Set up IAM Permissions for SES

Create a policy that allows the necessary SES operations:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendQuota"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. SES Sandbox Mode

By default, new AWS accounts have SES in "sandbox" mode. In this mode:

- You can only send emails to verified email addresses
- Daily sending limits are restricted

To move out of the sandbox mode:

1. Go to the SES Console
2. Click on "Account dashboard"
3. Under "Sending limits", click "Request production access"
4. Fill out the form with your use case details

## Creating the IAM User or Role

### For Local Development

Create an IAM user with programmatic access:

1. Go to the IAM Console
2. Click "Users" → "Add user"
3. Enter a name and enable "Programmatic access"
4. Attach the S3 and SES policies you created
5. Complete the user creation and securely save the access key and secret

### For Production Deployment

If deploying on AWS services like EC2, ECS, or Lambda, use IAM roles instead:

1. Create IAM roles with the appropriate S3 and SES policies
2. Attach these roles to your AWS resources

## Testing Your Configuration

After setting up the environment, use the testing page at `/aws-test` to verify your AWS configuration is working correctly.

## Troubleshooting

- **Access Denied Errors**: Check your IAM permissions
- **Invalid Credentials**: Ensure your environment variables are set correctly
- **SES Sending Failures**: Make sure your sender email is verified and you're sending to verified emails if in sandbox mode
- **S3 Upload Issues**: Verify CORS configuration and bucket permissions

## Security Best Practices

- Never expose AWS credentials in client-side code
- Use IAM roles for AWS services when possible
- Implement the principle of least privilege for IAM policies
- Consider setting up CloudWatch alarms for unusual activity
- Regularly rotate IAM access keys 