import { PrismaService } from 'src/prisma.service';
// import { User, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const FabricCAServices = require('fabric-ca-client');
// import FabricCAServices from 'fabric-ca-client';
const { Wallets } = require('fabric-network');
// import { Wallets } from 'fabric-network';
// const fs = require('fs');
// import fs from 'fs';
const path = require('path');
// import path from 'path';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findUserByMail(email: string) {
    // return this.prisma.findUserByMail(email);
  }
}
