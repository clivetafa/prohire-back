import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from '../utils/password.utils';
import { sendEmail, emailTemplates } from '../config/email';
import crypto from 'crypto';

export class PasswordService {
  // Generate reset token
  async generateResetToken(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal that user doesn't exist
      return { message: 'If your email is registered, you will receive a password reset link' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save token to database (expires in 1 hour)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Send email with reset link
    try {
      await sendEmail(
        user.email,
        emailTemplates.resetPassword(user.firstName, resetToken).subject,
        emailTemplates.resetPassword(user.firstName, resetToken).html
      );
    } catch (error) {
      console.error('Failed to send reset email:', error);
      // Don't throw - we don't want to reveal if email failed
    }

    return { message: 'If your email is registered, you will receive a password reset link' };
  }

  // Reset password
  async resetPassword(token: string, newPassword: string) {
    // Hash the token for comparison
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Password reset successful' };
  }

  // Change password (authenticated users)
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password (you'll need to import comparePassword)
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }
}