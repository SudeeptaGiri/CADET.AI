const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create transporter
const transporter = nodemailer.createTransport({
  service: config.EMAIL_SERVICE,
  auth: {
    user: config.EMAIL_USERNAME,
    pass: config.EMAIL_PASSWORD
  }
});

// Send welcome email
exports.sendWelcomeEmail = async (user) => {
  const mailOptions = {
    from: `"Interview Platform" <${config.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Welcome to Interview Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
          <h1>Welcome to Interview Platform</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Hello ${user.name},</p>
          <p>Thank you for joining our Interview Platform. We're excited to have you on board!</p>
          <p>With our platform, you can:</p>
          <ul>
            <li>Schedule AI-powered interviews</li>
            <li>Assess candidates efficiently</li>
            <li>Get detailed performance reports</li>
          </ul>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The Interview Platform Team</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset email
exports.sendPasswordResetEmail = async (user, resetURL) => {
  const mailOptions = {
    from: `"Interview Platform" <${config.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Your Password Reset Token (valid for 10 minutes)',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
          <h1>Reset Your Password</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Please click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetURL}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 10 minutes.</p>
          <p>Best regards,<br>The Interview Platform Team</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send interview invitation
exports.sendInterviewInvitation = async (interview) => {
  // Format date and time
  const interviewDate = new Date(interview.scheduledDate);
  const formattedDate = interviewDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedTime = interviewDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const interviewLink = `${config.FRONTEND_URL}/interview/join`;

  const mailOptions = {
    from: `"Interview Platform" <${config.EMAIL_FROM}>`,
    to: interview.candidateEmail,
    subject: `Interview Invitation: ${interview.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
          <h1>Interview Invitation</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Hello ${interview.candidateName},</p>
          <p>You have been invited to an interview for <strong>${interview.title}</strong>.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 10px 0;"><strong>Duration:</strong> ${interview.duration} minutes</p>
            <p style="margin: 10px 0;"><strong>Type:</strong> ${interview.interviewType}</p>
          </div>
          <p>To access your interview, you will need the following credentials:</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <p style="margin: 0;"><strong>Access Code:</strong> ${interview.accessCode}</p>
            <p style="margin: 10px 0;"><strong>Password:</strong> ${interview.accessPasswordPlain}</p>
          </div>
          <p>Please keep these credentials confidential and use them to join the interview at the scheduled time.</p>
          <p>Topics that will be covered:</p>
          <ul>
            ${interview.topics.map(topic => `<li>${topic}</li>`).join('')}
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${interviewLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Interview</a>
          </div>
          <p>Please join the interview 5 minutes before the scheduled time to set up your camera and microphone.</p>
          <p>If you have any questions or need to reschedule, please contact us.</p>
          <p>Best regards,<br>The Interview Platform Team</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send interview cancellation
exports.sendInterviewCancellation = async (interview) => {
  const mailOptions = {
    from: `"Interview Platform" <${config.EMAIL_FROM}>`,
    to: interview.candidateEmail,
    subject: `Interview Cancelled: ${interview.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; padding: 20px; text-align: center; color: white;">
          <h1>Interview Cancelled</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Hello ${interview.candidateName},</p>
          <p>We regret to inform you that your interview for <strong>${interview.title}</strong> has been cancelled.</p>
          <p>If you have any questions or would like to reschedule, please contact us.</p>
          <p>We apologize for any inconvenience this may have caused.</p>
          <p>Best regards,<br>The Interview Platform Team</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};