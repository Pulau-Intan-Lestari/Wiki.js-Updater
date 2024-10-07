import { google } from "googleapis";
import nodemailer from 'nodemailer';

const SERVICE_ACCOUNT_FILE = '../../key.json';
const serviceAccount = require(SERVICE_ACCOUNT_FILE);

export async function sendEmailViaAgentVNodeMailer (recipient: string[], subject: string, htmlContent: string) {
    // Credentials obtained from your service account JSON key file
    const credentials = {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key
    };

    // Configure Nodemailer to generate an SMTP configuration
    const mailTransport = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
    });

    // Email contents
    const mailOptions = {
        from: 'website@pulauintanlestari.com',
        to: recipient.join(","),
        subject: subject,
        html: htmlContent
    };

    // Function to send the email using Gmail API
    async function sendMimeMessage(mimeMessage) {
        const gmail = google.gmail({ version: 'v1' });
        const jwtClient = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/gmail.send'],
            // Specify the email address of the user the service account is impersonating.
            // Ensure the service account has domain-wide authority to impersonate this user.
            'website@pulauintanlestari.com'
        );

        // Authorize the JWT client and get a token to make API calls
        await jwtClient.authorize();

        // Send the email using the Gmail API
        const response = await gmail.users.messages.send({
            auth: jwtClient,
            userId: 'me',
            requestBody: {
                raw: mimeMessage
      }
        });

        console.log('Email sent:', response.data);
    }

    // Generate MIME message and send email
    mailTransport.sendMail(mailOptions, (err, info) => {
        if (err) {
            return console.error('Failed to send mail:', err);
        }

        const mimeMessage = info.message.toString('base64');
        sendMimeMessage(mimeMessage)
            .then(() => console.log('Email sent successfully.'))
            .catch(error => console.error('Error sending email:', error));
    });
}

export async function sendEmailViaAgent(recipient: string[], subject: string, htmlContent: string) {
    const jwtClient = new google.auth.JWT(
        serviceAccount.client_email,
        undefined,
        serviceAccount.private_key,
        ['https://www.googleapis.com/auth/gmail.send'],
        'website@pulauintanlestari.com'
    );

    // Authenticate request
    // Subsequent Calls: The Google API client libraries are designed to handle token refresh efficiently. 
    // Once the initial token is obtained, the library caches it. 
    // For subsequent calls, if the token is still valid (i.e., not expired), jwtClient.authorize() returns quickly without needing to re-authenticate. 
    // If the token has expired, the library automatically handles the process of obtaining a new token.
    // so dont mind these...
    await jwtClient.authorize();
    // console.log(jwtClient.credentials.access_token)

    const gmail = google.gmail({ version: 'v1', auth: jwtClient });

    // Create email
    const emailLines = [
        `To: ${recipient.join(',')}`,
        'Content-type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        '',
        htmlContent
    ];

    const email = emailLines.join('\n').trim();
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedEmail,
        },
    });
    console.log({
        response: response.data
    })
    return response.data;
}