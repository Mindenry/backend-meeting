SELECT email, name, role, "isActive", CASE WHEN password IS NULL THEN 'NO PASSWORD' ELSE 'HAS PASSWORD' END as password_status FROM "User" LIMIT 10;
