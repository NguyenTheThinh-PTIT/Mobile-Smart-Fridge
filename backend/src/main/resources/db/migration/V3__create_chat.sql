CREATE TABLE chat_session (
    id SERIAL PRIMARY KEY,
    member_id INT,
    title VARCHAR(255),
    context_tags TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_chat_member FOREIGN KEY (member_id) REFERENCES household_member(id)
);

CREATE TABLE chat_message (
    id SERIAL PRIMARY KEY,
    session_id INT,
    sender_type VARCHAR(50),
    content TEXT,
    "timestamp" TIMESTAMP,
    CONSTRAINT fk_chat_message_session FOREIGN KEY (session_id) REFERENCES chat_session(id)
);
