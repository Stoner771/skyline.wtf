"""
Script to create the first admin account.
Run this after setting up the database.
"""
import sys
from sqlalchemy.orm import Session
from database import SessionLocal
from models.admin import Admin
from security.password import hash_password

def create_admin(username: str, password: str, email: str = None):
    db: Session = SessionLocal()
    try:
        existing = db.query(Admin).filter(Admin.username == username).first()
        if existing:
            print(f"Admin '{username}' already exists!")
            return False
        
        admin = Admin(
            username=username,
            password_hash=hash_password(password),
            email=email
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Admin '{username}' created successfully!")
        return True
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <username> <password> [email]")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    email = sys.argv[3] if len(sys.argv) > 3 else None
    
    create_admin(username, password, email)

