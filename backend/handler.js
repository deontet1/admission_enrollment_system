import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses    = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE        = process.env.APPLICATIONS_TABLE;
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL;
const FROM_EMAIL   = process.env.FROM_EMAIL;

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'program'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json'
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function buildApplicantEmail(data) {
  return {
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [data.email] },
    Message: {
      Subject: { Data: 'Your Application Has Been Received' },
      Body: {
        Text: {
          Data:
`Hi ${data.firstName},

Thanks for submitting your application. Our admissions team will follow up with you shortly to confirm next steps, review available schedules, and walk through the enrollment process.

If you have any questions in the meantime, feel free to reach out.

Admissions Team`
        }
      }
    }
  };
}

function buildAdminEmail(data) {
  return {
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [ADMIN_EMAIL] },
    Message: {
      Subject: { Data: 'New Application Submitted' },
      Body: {
        Text: {
          Data:
`A new application has been submitted.

APPLICATION DETAILS
-------------------
Application ID:       ${data.applicationId}
Submitted At:         ${data.submittedAt}

APPLICANT INFORMATION
---------------------
Name:                 ${data.firstName} ${data.lastName}
Email:                ${data.email}
Phone:                ${data.phone}
Date of Birth:        ${data.dateOfBirth}

PROGRAM SELECTION
-----------------
Program:              ${data.program}
Preferred Schedule:   ${data.preferredSchedule || 'Not specified'}

COMMENTS
--------
${data.additionalComments || 'None provided'}

Record stored in table: ${TABLE}`
        }
      }
    }
  };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return respond(200, {});
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return respond(400, { status: 'error', message: 'Invalid JSON body' });
  }

  if (!body || typeof body !== 'object') {
    return respond(400, { status: 'error', message: 'Missing required fields' });
  }

  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || String(body[field]).trim() === '') {
      return respond(400, { status: 'error', message: 'Missing required fields' });
    }
  }

  const applicationId = randomUUID();
  const submittedAt   = new Date().toISOString();

  const item = {
    applicationId,
    firstName:          String(body.firstName).trim(),
    lastName:           String(body.lastName).trim(),
    email:              String(body.email).trim().toLowerCase(),
    phone:              String(body.phone).trim(),
    dateOfBirth:        String(body.dateOfBirth).trim(),
    program:            String(body.program).trim(),
    preferredSchedule:  body.preferredSchedule  ? String(body.preferredSchedule).trim()  : '',
    additionalComments: body.additionalComments ? String(body.additionalComments).trim() : '',
    submittedAt
  };

  try {
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  } catch (err) {
    console.error('DynamoDB write failed:', err);
    return respond(500, { status: 'error', message: 'Failed to save application' });
  }

  try {
    await ses.send(new SendEmailCommand(buildApplicantEmail(item)));
  } catch (err) {
    console.error('Applicant email failed:', err);
  }

  try {
    await ses.send(new SendEmailCommand(buildAdminEmail(item)));
  } catch (err) {
    console.error('Admin email failed:', err);
  }

  return respond(200, { status: 'success' });
};
