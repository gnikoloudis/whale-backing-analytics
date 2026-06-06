from sqlalchemy import Column, String, Float, BigInteger, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base

class StockMetadata(Base):
    __tablename__ = "stock_metadata"

    symbol = Column(String, primary_key=True, index=True)
    market_cap = Column(BigInteger, nullable=True)
    category = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    deep_dive_captured = Column(String, nullable=True)
    timestamp = Column(String, nullable=True)

    # Relationships for convenient querying
    institutional_holders = relationship(
        "InstitutionalHolder", 
        back_populates="stock", 
        cascade="all, delete-orphan"
    )
    mutualfund_holders = relationship(
        "MutualFundHolder", 
        back_populates="stock", 
        cascade="all, delete-orphan"
    )
    news = relationship(
        "StockNews", 
        back_populates="stock", 
        cascade="all, delete-orphan"
    )


class InstitutionalHolder(Base):
    __tablename__ = "institutional_holders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String, ForeignKey("stock_metadata.symbol", ondelete="CASCADE"), index=True, nullable=False)
    date_reported = Column(String, nullable=True)
    holder = Column(String, nullable=True)
    pct_held = Column(Float, nullable=True)
    shares = Column(BigInteger, nullable=True)
    value = Column(Float, nullable=True)
    pct_change = Column(Float, nullable=True)
    timestamp = Column(String, nullable=True, index=True)

    stock = relationship("StockMetadata", back_populates="institutional_holders")


class MutualFundHolder(Base):
    __tablename__ = "mutual_fund_holders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String, ForeignKey("stock_metadata.symbol", ondelete="CASCADE"), index=True, nullable=False)
    date_reported = Column(String, nullable=True)
    holder = Column(String, nullable=True)
    pct_held = Column(Float, nullable=True)
    shares = Column(BigInteger, nullable=True)
    value = Column(Float, nullable=True)
    pct_change = Column(Float, nullable=True)
    timestamp = Column(String, nullable=True, index=True)

    stock = relationship("StockMetadata", back_populates="mutualfund_holders")


class StockNews(Base):
    __tablename__ = "stock_news"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String, ForeignKey("stock_metadata.symbol", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String, nullable=False)
    publisher = Column(String, nullable=True)
    link = Column(String, nullable=True)
    publish_time = Column(BigInteger, nullable=True)
    timestamp = Column(String, nullable=True, index=True)

    stock = relationship("StockMetadata", back_populates="news")
