-- Clear all thread IDs to force new threads with updated instructions
UPDATE conversation_context 
SET thread_id = NULL, 
    updated_at = NOW();

-- Log the reset
INSERT INTO system_logs (log_type, message, created_at) 
VALUES ('thread_reset', 'All conversation threads cleared for new prompt', NOW());