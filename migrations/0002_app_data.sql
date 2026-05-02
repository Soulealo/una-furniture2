-- Add columns to products (will fail if columns already exist)
ALTER TABLE products ADD imageUrls NVARCHAR(MAX);
ALTER TABLE products ADD sizes NVARCHAR(MAX);
ALTER TABLE products ADD stock INT CONSTRAINT DF_products_stock DEFAULT 0;

-- Create users table if it doesn't exist (T-SQL)
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'users' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE dbo.users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(255),
        fullname NVARCHAR(255),
        email NVARCHAR(320) UNIQUE,
        passwordHash NVARCHAR(255),
        phone NVARCHAR(50),
        address NVARCHAR(500),
        role NVARCHAR(50) DEFAULT 'user',
        createdAt DATETIME DEFAULT GETDATE(),
        updatedAt DATETIME DEFAULT GETDATE()
    );
END

-- Create categories table if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'categories' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE dbo.categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) UNIQUE,
        createdAt DATETIME DEFAULT GETDATE(),
        updatedAt DATETIME DEFAULT GETDATE()
    );
END

-- Create orders table if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'orders' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE dbo.orders (
        id INT IDENTITY(1,1) PRIMARY KEY,
        orderCode NVARCHAR(255) UNIQUE,
        userId INT,
        items NVARCHAR(MAX),
        totalAmount INT,
        paymentMethod NVARCHAR(100),
        transactionCode NVARCHAR(255),
        status NVARCHAR(100),
        createdAt DATETIME DEFAULT GETDATE(),
        updatedAt DATETIME DEFAULT GETDATE()
    );
END

-- Create payment_settings table if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'payment_settings' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE dbo.payment_settings (
        id INT PRIMARY KEY,
        bankName NVARCHAR(255),
        accountNumber NVARCHAR(100),
        accountHolder NVARCHAR(255),
        facebookChatUrl NVARCHAR(1000),
        updatedAt DATETIME DEFAULT GETDATE()
    );
END

-- Create admin_settings table if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name = 'admin_settings' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE dbo.admin_settings (
        id INT PRIMARY KEY,
        username NVARCHAR(255) UNIQUE,
        email NVARCHAR(320),
        passwordHash NVARCHAR(255),
        createdAt DATETIME DEFAULT GETDATE(),
        updatedAt DATETIME DEFAULT GETDATE()
    );
END

-- Insert default category if not exists
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE name = 'Uncategorized')
BEGIN
    INSERT INTO dbo.categories (name, createdAt, updatedAt)
    VALUES ('Uncategorized', GETDATE(), GETDATE());
END

-- Insert default payment_settings row if not exists
IF NOT EXISTS (SELECT 1 FROM dbo.payment_settings WHERE id = 1)
BEGIN
    INSERT INTO dbo.payment_settings (id, bankName, accountNumber, accountHolder, facebookChatUrl, updatedAt)
    VALUES (1, 'Khan Bank', '', 'UNA Home & Furniture', '', GETDATE());
END

-- Insert default admin_settings row if not exists
IF NOT EXISTS (SELECT 1 FROM dbo.admin_settings WHERE id = 1)
BEGIN
    INSERT INTO dbo.admin_settings (id, username, email, passwordHash, createdAt, updatedAt)
    VALUES (1, 'admin', '', '', GETDATE(), GETDATE());
END
