from sqlalchemy.orm import Session
from models.app import App
from models.admin import Admin
from schemas.app import AppCreate, AppUpdate
import secrets
import string


def get_app_by_secret(db: Session, secret: str):
    return db.query(App).filter(App.secret == secret).first()


def create_app(db: Session, app_data: AppCreate, admin_id: int):
    secret = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    app = App(
        name=app_data.name,
        secret=secret,
        version=app_data.version,
        webhook_url=app_data.webhook_url,
        admin_id=admin_id
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def get_apps_by_admin(db: Session, admin_id: int, skip: int = 0, limit: int = 100):
    return db.query(App).filter(App.admin_id == admin_id).offset(skip).limit(limit).all()


def update_app(db: Session, app_id: int, app_data: AppUpdate, admin_id: int):
    app = db.query(App).filter(App.id == app_id, App.admin_id == admin_id).first()
    if not app:
        return None
    if app_data.name is not None:
        app.name = app_data.name
    if app_data.version is not None:
        app.version = app_data.version
    if app_data.force_update is not None:
        app.force_update = app_data.force_update
    if app_data.webhook_url is not None:
        app.webhook_url = app_data.webhook_url
    db.commit()
    db.refresh(app)
    return app


def delete_app(db: Session, app_id: int, admin_id: int):
    app = db.query(App).filter(App.id == app_id, App.admin_id == admin_id).first()
    if not app:
        return False
    db.delete(app)
    db.commit()
    return True

