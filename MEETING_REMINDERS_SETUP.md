# Meeting Reminders System Setup

ระบบแจ้งเตือนการประชุมจะส่งการแจ้งเตือนให้ผู้ใช้ก่อนการประชุม 5, 15, และ 30 นาที

## การติดตั้ง

1. ติดตั้ง package ที่จำเป็น:
```bash
cd backend-meeting
npm install @nestjs/schedule
```

2. รัน Prisma migration เพื่อสร้างตาราง MeetingReminder:
```bash
npx prisma migrate dev --name add_meeting_reminders
```

หรือถ้าต้องการสร้าง migration file:
```bash
npx prisma migrate dev --create-only --name add_meeting_reminders
```

3. Generate Prisma client:
```bash
npx prisma generate
```

4. รีสตาร์ท backend server:
```bash
npm run start:dev
```

## วิธีการทำงาน

- ระบบจะตรวจสอบการประชุมที่กำลังจะเกิดขึ้นทุก 1 นาที
- ส่งการแจ้งเตือนอัตโนมัติที่:
  - 30 นาทีก่อนการประชุม
  - 15 นาทีก่อนการประชุม
  - 5 นาทีก่อนการประชุม
- การแจ้งเตือนจะถูกส่งไปยัง:
  - Host (ผู้จัดประชุม)
  - Participants (ผู้เข้าร่วมที่ลงทะเบียน)
  - Team members (สมาชิกทีม หากการประชุมเชื่อมโยงกับทีม)

## การทดสอบ

คุณสามารถทดสอบระบบได้โดยการ:

1. สร้างการประชุมใหม่ที่มี startTime ในอนาคต
2. ใช้ API endpoint เพื่อ trigger การตรวจสอบ reminders:
```bash
POST http://localhost:3000/meeting-reminders/trigger
```

## หมายเหตุ

- ระบบจะไม่ส่งการแจ้งเตือนซ้ำให้กับผู้ใช้ที่ได้รับแล้ว
- การแจ้งเตือนจะถูกบันทึกในตาราง `MeetingReminder` เพื่อป้องกันการส่งซ้ำ
- ระบบจะตรวจสอบเฉพาะการประชุมที่มี status = 'scheduled' เท่านั้น
