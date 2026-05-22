-- Legacy manual seed (optional). Prefer Prisma: see ../PRISMA.md
-- Create the table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  age INT
);

-- Insert sample data
INSERT INTO users (name, email, age) VALUES
('Alice', 'alice@example.com', 28),
('Bob', 'bob@example.com', 34),
('Charlie', 'charlie@example.com', 22);
