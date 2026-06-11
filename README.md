# Admissions and Enrollment System — AWS Serverless

A serverless admissions platform built for a healthcare training provider that runs both online and in-person certification programs. It replaces a fully manual intake process with an automated, centralized workflow on AWS and is projected to reduce recruitment processing time by 75%.

---

## The Problem

The client was managing student intake across email, social media, and direct messages. Nothing was centralized and tracking applicants manually was eating up time she didn't have. When her third-party learning platform went offline unexpectedly, it pushed back upcoming cohorts and cost her real revenue. She needed something stable that she actually owned.

---

## What We Built

I started by reviewing her entire intake process and mapping where things were breaking down. From there I recommended moving admissions to AWS and walked her through why a serverless approach made sense for her business. She was skeptical at first so we agreed to prove it out with a Phase 1 MVP before going further. Once she saw it running with real applications flowing through and a clean user experience on the front end, she approved Phase 2 on the spot.

---

## Architecture

Fully serverless on AWS:

![AWS Application Submission Workflow — Serverless Admissions Intake Architecture](docs/screenshots/architecture-diagram.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| API | Amazon API Gateway |
| Compute | AWS Lambda (Python) |
| Database | Amazon DynamoDB |
| Notifications | Amazon SES |
| Monitoring | Amazon CloudWatch |

---

## Phase 1 — Delivered

- Rebuilt the client's website with a modern application form integrated directly into the AWS backend
- Serverless processing with input validation and error handling baked in
- DynamoDB storing structured applicant records on every submission
- Automated email notifications via Amazon SES, configured and integrated with production access request in progress
- Full logging and monitoring set up in CloudWatch
- Client reviewed the full system and approved it

---

## Screenshots

### Application Form
The live form collecting student applications across six programs with schedule preference and tuition policy disclosure.

![Application Form](docs/screenshots/Application_pre_submission.png)

---

### DynamoDB — Table Created
The AdmissionsApplications table is active in DynamoDB with applicationId as the partition key, ready to receive structured records from every form submission.

![DynamoDB Table Created](docs/screenshots/DynamoDB_Table_Created.png)

---

### DynamoDB — Applicant Records
Every submission is stored as a structured record in DynamoDB. The table captures applicationId, name, email, phone, date of birth, program selection, schedule preference, comments, and submission timestamp.

![DynamoDB Records](docs/screenshots/Application_received.png)

---

### API Gateway — POST /apply Route
The AdmissionsAPI is deployed in us-east-1 with a single POST /apply route wired directly to the Lambda function.

![API Gateway](docs/screenshots/Api_gateway_console.png)

---

### Amazon SES — Identity Verification
The sender email identity was created in SES and is pending verification. Once verified, the Lambda function will use it to dispatch confirmation emails to applicants automatically.

![SES Identity](docs/screenshots/Creating_an_identity_.png)

---

### CloudWatch — Execution Logs
Every function invocation is logged in CloudWatch. The logs confirm the Lambda triggered, the Textract job started, and execution completed without errors.

![CloudWatch Logs](docs/screenshots/cloudwatch-success-logs.png)

---

### Backend — Successful End-to-End Run
Full end-to-end test confirming the application was received, processed, written to DynamoDB, and the email notification dispatched without errors.

![Backend Success](docs/screenshots/backend_success_problem_resolved.png)

---

## What Went Wrong

I discovered that applications were not saving to DynamoDB because the Lambda function was failing before it ever reached the database write. The SES email step was running first, and it was failing because the email identity had not been verified and SES had been set up in the wrong region. Once SES threw an error, the function stopped entirely and the data was never written.

I fixed this by moving the DynamoDB write to the beginning of the function so the record is saved regardless of what happens downstream. I wrapped the SES email call in a try/except block so an email failure logs a warning without killing the rest of the execution. I also verified the email identity and recreated the SES configuration in the correct region. After those changes the workflow became reliable and the intake process worked end to end as expected.

---

## Phase 2 — In Progress

- Custom Application ID generation for every submission
- IAM least-privilege access controls for internal tooling
- Third-party payment processing integration
- Owner approval and rejection workflows with automated notifications
- Enrollment dashboard for managing applicants and statuses
- Cohort management covering both online and in-person programs

See [Phase 2 Architecture Plan](docs/phase-2-architecture.md) for full details.

---

## Future Phases

- Hosting course content directly on AWS so the client is never dependent on a third-party platform again
- A student portal for accessing materials and program updates
- Automated onboarding sequences after enrollment is confirmed
- Seat tracking for in-person cohorts
- Enrollment reporting and trend analytics
- Support for additional programs and certifications as the business grows

---

## Why I Built It This Way

See [Architecture Decision Log](docs/architecture-decisions.md) for the full reasoning behind every major technical choice.

The short version: DynamoDB over RDS because the schema is still evolving. Serverless over containerized because the workload is event-driven and Lambda costs nothing between cohorts. Seat reservation decoupled from submission to prevent ghost holds. Online and in-person on separate workflows because they have fundamentally different requirements.
