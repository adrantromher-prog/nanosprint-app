@echo off
set DATABASE_URL=postgresql://neondb_owner:npg_0J9HaWhrmTcf@ep-shy-tree-atp62u7t-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
set NEXTAUTH_SECRET=clave-local-123
set JWT_SECRET=otra-clave-local-456
set NEXTAUTH_URL=http://localhost:3000
set PORT=3000
npm run dev
pause
