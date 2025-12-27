from sqlalchemy.orm import Session
from models.log import Log
from datetime import datetime


def create_log(
    db: Session,
    app_id: int,
    action: str,
    ip_address: str = None,
    user_agent: str = None,
    details: str = None,
    user_id: int = None
):
    log = Log(
        app_id=app_id,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        user_id=user_id
    )
    db.add(log)
    db.commit()
    return log

