"""
Database initialization script
Creates all tables and sets up initial data
"""
from database import engine, Base, SessionLocal
from models.admin import Admin
from models.app import App
from models.license import License
from models.user import User
from models.reseller import Reseller, CreditTransaction, ResellerApplication
from models.ticket import Ticket, TicketMessage, TicketAttachment, TicketStatus, TicketPriority
from models.file import File
from models.log import Log
from models.variable import Variable
from security.password import hash_password
from datetime import datetime
import sys

def init_database():
    """Initialize database with all tables"""
    print("🔧 Initializing database...")
    
    try:
        # Create all tables
        print("📊 Creating tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        
        # List all tables
        print("\n📋 Created tables:")
        for table in Base.metadata.sorted_tables:
            print(f"  - {table.name}")
        
        # Create session
        db = SessionLocal()
        
        # Check if admin exists
        admin = db.query(Admin).filter(Admin.username == "admin").first()
        if not admin:
            print("\n👤 Creating default admin...")
            admin = Admin(
                username="admin",
                email="admin@skyline.com",
                password_hash=hash_password("admin123"),
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✅ Default admin created!")
            print("   Username: admin")
            print("   Password: admin123")
        else:
            print("\n✅ Admin already exists")
        
        # Check if sample app exists
        app = db.query(App).filter(App.name == "Sample App").first()
        if not app:
            print("\n📱 Creating sample application...")
            app = App(
                name="Sample App",
                secret="sample-secret-key-change-this",
                version="1.0.0",
                force_update=False,
                admin_id=admin.id
            )
            db.add(app)
            db.commit()
            print("✅ Sample app created!")
        else:
            print("\n✅ Sample app already exists")
        
        # Check database integrity
        print("\n🔍 Verifying database integrity...")
        admin_count = db.query(Admin).count()
        app_count = db.query(App).count()
        reseller_count = db.query(Reseller).count()
        license_count = db.query(License).count()
        
        print(f"  Admins: {admin_count}")
        print(f"  Apps: {app_count}")
        print(f"  Resellers: {reseller_count}")
        print(f"  Licenses: {license_count}")
        
        db.close()
        print("\n✅ Database initialization complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
