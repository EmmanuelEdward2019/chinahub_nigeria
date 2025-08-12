-- Process all pending wallet topup transactions
DO $$
DECLARE
    pending_transaction RECORD;
    result JSON;
BEGIN
    FOR pending_transaction IN 
        SELECT * FROM transactions 
        WHERE transaction_type = 'wallet_topup' 
        AND status = 'pending' 
        ORDER BY created_at ASC
    LOOP
        BEGIN
            -- Process wallet topup
            SELECT process_wallet_topup(
                pending_transaction.user_id,
                pending_transaction.amount,
                pending_transaction.currency,
                pending_transaction.reference
            ) INTO result;
            
            -- Create success notification for user
            INSERT INTO notifications (
                user_id,
                title,
                message,
                type
            ) VALUES (
                pending_transaction.user_id,
                'Wallet Top-up Successful',
                'Your wallet has been credited with ' || 
                CASE 
                    WHEN pending_transaction.currency = 'NGN' THEN '₦' 
                    ELSE '$' 
                END || pending_transaction.amount::text,
                'success'
            );
            
            -- Create admin notification
            INSERT INTO notifications (
                user_id,
                title,
                message,
                type
            )
            SELECT 
                ur.user_id,
                'Wallet Top-up Received',
                'User wallet credited with ' || 
                CASE 
                    WHEN pending_transaction.currency = 'NGN' THEN '₦' 
                    ELSE '$' 
                END || pending_transaction.amount::text || '. Reference: ' || pending_transaction.reference,
                'info'
            FROM user_roles ur 
            WHERE ur.role = 'admin' 
            LIMIT 1;
            
            RAISE NOTICE 'Processed transaction %', pending_transaction.reference;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to process transaction %: %', pending_transaction.reference, SQLERRM;
        END;
    END LOOP;
END $$;