from database import SessionLocal
from models.admin import Admin
from models.reseller import Reseller
from security.password import verify_password, hash_password

db = SessionLocal()

# Reset admin password
admin = db.query(Admin).first()
if admin:
    if not verify_password('admin123', admin.password_hash):
        print(f'Admin password incorrect, resetting...')
        admin.password_hash = hash_password('admin123')
        db.commit()
        print('✅ Admin password reset to: admin123')
    else:
        print('✅ Admin password is already correct: admin123')

# Reset reseller password
reseller = db.query(Reseller).filter(Reseller.username == 'sujal').first()
if reseller:
    if not verify_password('sujal123', reseller.password_hash):
        print(f'Reseller password incorrect, resetting...')
        reseller.password_hash = hash_password('sujal123')
        db.commit()
        print('✅ Reseller password reset to: sujal123')
    else:
        print('✅ Reseller password is already correct: sujal123')

db.close()
print('\n📋 Login Credentials:')
print('=' * 40)
print('Admin:')
print('  Username: admin')
print('  Password: admin123')
print('\nReseller:')
print('  Username: sujal')
print('  Password: sujal123')
print('=' * 40)
