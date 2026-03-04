# 🔧 แก้ไข TypeScript Error: Cannot find module

## ปัญหา
TypeScript ไม่สามารถหา module `../common/decorators/swagger.decorators` ได้

## วิธีแก้ไข

### 1. Restart TypeScript Server (แนะนำ)
ใน VS Code หรือ IDE:
- กด `Cmd+Shift+P` (Mac) หรือ `Ctrl+Shift+P` (Windows/Linux)
- พิมพ์ "TypeScript: Restart TS Server"
- กด Enter

### 2. หรือ Restart IDE
- ปิดและเปิด IDE ใหม่

### 3. ตรวจสอบว่าไฟล์มีอยู่
```bash
cd backend-meeting
ls -la src/common/decorators/swagger.decorators.ts
```

### 4. Clear TypeScript Cache
```bash
cd backend-meeting
rm -rf node_modules/.cache
rm -rf dist
```

### 5. Rebuild
```bash
cd backend-meeting
npm run build
```

## ไฟล์ที่สร้างแล้ว
- ✅ `src/common/decorators/swagger.decorators.ts` - Swagger decorators wrapper
- ✅ `src/common/decorators/index.ts` - Export file

## หมายเหตุ
ไฟล์มีอยู่แล้วและ linter ไม่พบ error แต่ TypeScript compiler อาจต้อง restart เพื่อ refresh module cache
