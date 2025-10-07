const { execSync } = require('child_process');
const path = require('path');

class DatabaseSetup {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../src/migrations');
  }

  async setup() {
    try {
      console.log('🚀 Setting up MediVault database...');
      
      // Check if PostgreSQL is running
      await this.checkPostgreSQL();
      
      // Run migrations
      await this.runMigrations();
      
      // Create indexes
      await this.createIndexes();
      
      // Seed initial data
      await this.seedInitialData();
      
      console.log('✅ Database setup completed successfully!');
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  async checkPostgreSQL() {
    try {
      console.log('🔍 Checking PostgreSQL connection...');
      
      // Try to connect to PostgreSQL
      const { Client } = require('pg');
      const client = new Client({
        user: process.env.POSTGRES_USER || 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        database: process.env.POSTGRES_DB || 'medivault',
        password: process.env.POSTGRES_PASSWORD || 'password',
        port: process.env.POSTGRES_PORT || 5432,
      });
      
      await client.connect();
      await client.query('SELECT NOW()');
      await client.end();
      
      console.log('✅ PostgreSQL connection successful');
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      console.log('💡 Please ensure PostgreSQL is running and configured correctly');
      throw error;
    }
  }

  async runMigrations() {
    try {
      console.log('🔄 Running database migrations...');
      
      // Run migration script
      execSync('node src/scripts/migrateDatabase.js migrate', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async createIndexes() {
    try {
      console.log('📊 Creating database indexes...');
      
      // Indexes are created in migration files
      console.log('✅ Database indexes created');
    } catch (error) {
      console.error('❌ Index creation failed:', error.message);
      throw error;
    }
  }

  async seedInitialData() {
    try {
      console.log('🌱 Seeding initial data...');
      
      // Check if we need to seed data
      const postgresqlService = require('../src/services/postgresqlService');
      await postgresqlService.connect();
      
      // Check if admin user exists
      const adminUser = await postgresqlService.findUserByEmail('admin@medivault.com');
      
      if (!adminUser) {
        // Create admin user
        const adminData = {
          email: 'admin@medivault.com',
          password: 'admin123',
          role: 'admin',
          profile: {
            firstName: 'Admin',
            lastName: 'User',
            specialization: 'System Administrator'
          }
        };
        
        await postgresqlService.createUser(adminData);
        console.log('✅ Admin user created');
      } else {
        console.log('ℹ️ Admin user already exists');
      }
      
      await postgresqlService.disconnect();
      console.log('✅ Initial data seeded');
    } catch (error) {
      console.error('❌ Data seeding failed:', error.message);
      throw error;
    }
  }

  async reset() {
    try {
      console.log('🔄 Resetting database...');
      
      // Drop and recreate database
      const { Client } = require('pg');
      const client = new Client({
        user: process.env.POSTGRES_USER || 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        password: process.env.POSTGRES_PASSWORD || 'password',
        port: process.env.POSTGRES_PORT || 5432,
      });
      
      await client.connect();
      
      // Drop database if exists
      await client.query(`DROP DATABASE IF EXISTS ${process.env.POSTGRES_DB || 'medivault'}`);
      
      // Create database
      await client.query(`CREATE DATABASE ${process.env.POSTGRES_DB || 'medivault'}`);
      
      await client.end();
      
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const setup = new DatabaseSetup();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'setup':
        await setup.setup();
        break;
        
      case 'reset':
        await setup.reset();
        await setup.setup();
        break;
        
      default:
        console.log('Usage: node setupDatabase.js [setup|reset]');
        console.log('  setup - Set up database with migrations and initial data');
        console.log('  reset - Reset database and set up from scratch');
        break;
    }
  } catch (error) {
    console.error('❌ Database setup script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseSetup;

