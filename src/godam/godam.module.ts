// src/godam/godam.module.ts

import { Module } from "@nestjs/common";
import { GodamController } from "./godam.controller";
import { GodamService } from "./godam.service";
import { PrismaModule } from "../prisma/prisma.module";
// NOTE: agar tumhare project mein "PrismaModule" nahi hai aur PrismaService
// seedha kisi doosre module mein register hai, to ye import line hata do
// aur GodamService ko usi jagah register kar dena jahan customers/expenses
// modules PrismaService use karte hain.

@Module({
  imports: [PrismaModule],
  controllers: [GodamController],
  providers: [GodamService],
})
export class GodamModule {}