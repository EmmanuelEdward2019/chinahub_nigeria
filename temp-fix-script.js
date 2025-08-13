// Temporary script to invoke the fix function
import { supabase } from './src/integrations/supabase/client.js';

async function fixPendingTransactions() {
  try {
    console.log('Invoking fix-paystack-transactions function...');
    const { data, error } = await supabase.functions.invoke('fix-paystack-transactions', {
      body: {}
    });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Function result:', data);
  } catch (err) {
    console.error('Script error:', err);
  }
}

fixPendingTransactions();