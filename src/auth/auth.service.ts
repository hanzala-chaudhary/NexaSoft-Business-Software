// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { user_roles: { include: { roles: true } } }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // Update failed attempts (Optional but good for security)
      await prisma.user.update({
        where: { id: user.id },
        data: { failed_login_attempts: { increment: 1 } }
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Reset failed attempts & update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        failed_login_attempts: 0,
        last_login_at: new Date()
      }
    });

    // 4. Generate Token
    const userRole = user.user_roles[0]?.roles?.name || 'User';
    const payload = { sub: user.id, email: user.email, role: userRole };

    return {
      message: 'Login successful',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: userRole,
        is_super_admin: user.is_super_admin
      }
    };
  }
}