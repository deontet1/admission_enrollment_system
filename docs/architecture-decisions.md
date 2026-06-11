# Architecture Decision Log

## Serverless over EC2

The goal of this project was to remove the manual workload that was slowing down the client's enrollment process. Using EC2 would have required provisioning, maintaining, and paying for a server even when no one was submitting applications. A serverless approach removes that burden completely. It gives the client infrastructure she owns without the ongoing management that comes with running a server. It also scales automatically and stays cost efficient during quiet periods.

## API Gateway as the Entry Point

The application form is hosted on GitHub Pages as a simple proof of concept so the client could see value quickly without waiting for a full website build. API Gateway connects that static frontend to the AWS backend over a secure HTTPS endpoint. It handles routing, request validation, and the integration with Lambda without any server management. When the client moves the site to a permanent host, the backend remains unchanged and the API endpoint stays the same.

## Event Driven Processing with Lambda

The admissions workflow is naturally event driven. A form is submitted and the system needs to process that submission independently. Lambda handles each submission as its own execution, scales automatically during busy enrollment periods, and costs nothing when no one is applying. This keeps the system responsive without requiring any pre-provisioned compute.

## DynamoDB over RDS

The data model is still evolving as the platform grows through different phases. A relational database would require schema migrations every time a new field is added. DynamoDB allows the structure to change without friction. It also provides predictable performance, automatic scaling, and minimal operational overhead, which fits the needs of this stage of the project.

## DynamoDB Write Before SES

The original Lambda function attempted to send the SES email before writing the record to DynamoDB. When SES failed due to an unverified identity and incorrect region configuration, the function stopped early and the application was never saved. This caused silent data loss. Reordering the workflow ensures the DynamoDB write happens first. The SES call now runs inside a try/except block so email failures are logged without interrupting the core intake process. This guarantees that every submission is captured even if email delivery fails.

## IAM Role for the Lambda Function

The Lambda function uses an IAM execution role that provides only the permissions required for the intake workflow. The role includes access to write records to DynamoDB, send email through SES, and publish logs to CloudWatch. These permissions are delivered through temporary credentials issued automatically by AWS, which removes the need for storing access keys in the code and keeps the function aligned with least privilege and standard AWS security practices.
