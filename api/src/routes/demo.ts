import express from 'express';
import { getSupabaseAdmin } from '../services/supabase';

const router = express.Router();
const supabaseAdmin = getSupabaseAdmin();

// List all auth users
router.get('/list-users', async (req, res) => {
  try {
    console.log('🔍 Listing all auth users...');
    
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return res.status(500).json({ error: 'Failed to list users', details: error.message });
    }

    const userList = users.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      providers: user.app_metadata?.providers || []
    }));

    console.log(`✅ Found ${userList.length} users`);
    
    res.json({ 
      users: userList,
      total: userList.length
    });
    
  } catch (error) {
    console.error('💥 Error listing users:', error);
    res.status(500).json({ 
      error: 'Failed to list users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a specific auth user
router.delete('/delete-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🗑️ Deleting auth user:', userId);
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }

    console.log('✅ Successfully deleted auth user:', userId);
    
    res.json({ 
      success: true,
      message: `User ${userId} deleted successfully`
    });
    
  } catch (error) {
    console.error('💥 Error deleting user:', error);
    res.status(500).json({ 
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete all auth users
router.delete('/delete-all-users', async (req, res) => {
  try {
    console.log('🗑️ Deleting all auth users...');
    
    // First, list all users
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to list users', details: listError.message });
    }

    console.log(`Found ${users.users.length} users to delete`);

    // Delete each user
    const deletePromises = users.users.map(async (user) => {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`Error deleting user ${user.id}:`, error);
        return { userId: user.id, success: false, error: error.message };
      }
      console.log(`✅ Deleted user: ${user.id} (${user.email})`);
      return { userId: user.id, success: true };
    });

    const results = await Promise.all(deletePromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`🎉 Deleted ${successful} users successfully, ${failed} failed`);
    
    res.json({ 
      success: true,
      message: `Deleted ${successful} users successfully`,
      results: results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    });
    
  } catch (error) {
    console.error('💥 Error deleting all users:', error);
    res.status(500).json({ 
      error: 'Failed to delete all users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Manual database operations
router.post('/db-insert', async (req, res) => {
  try {
    const { table, data } = req.body;
    
    if (!table || !data) {
      return res.status(400).json({ error: 'Missing table or data parameter' });
    }

    console.log(`📝 Inserting into ${table}:`, data);
    
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select();

    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      return res.status(500).json({ error: `Failed to insert into ${table}`, details: error.message });
    }

    console.log(`✅ Successfully inserted into ${table}:`, result);
    
    res.json({ 
      success: true,
      table,
      data: result
    });
    
  } catch (error) {
    console.error('💥 Error in manual insert:', error);
    res.status(500).json({ 
      error: 'Failed to insert data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/db-select/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const select = req.query.select as string || '*';
    const where = req.query.where as string;
    
    console.log(`🔍 Selecting from ${table} with select: ${select}`);
    
    let query = supabaseAdmin.from(table).select(select);
    
    if (where) {
      try {
        const whereClause = JSON.parse(where) as Record<string, any>;
        Object.entries(whereClause).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      } catch (parseError) {
        console.error('Error parsing where clause:', parseError);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error selecting from ${table}:`, error);
      return res.status(500).json({ error: `Failed to select from ${table}`, details: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} records in ${table}`);
    
    res.json({ 
      success: true,
      table,
      count: data?.length || 0,
      data
    });
    
  } catch (error) {
    console.error('💥 Error in manual select:', error);
    res.status(500).json({ 
      error: 'Failed to select data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/db-delete/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const where = req.query.where as string;
    
    console.log(`🗑️ Deleting from ${table}`);
    
    let query = supabaseAdmin.from(table).delete();
    
    if (where) {
      try {
        const whereClause = JSON.parse(where as string) as Record<string, any>;
        Object.entries(whereClause).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      } catch (parseError) {
        console.error('Error parsing where clause:', parseError);
      }
    }

    const { error } = await query;

    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      return res.status(500).json({ error: `Failed to delete from ${table}`, details: error.message });
    }

    console.log(`✅ Successfully deleted from ${table}`);
    
    res.json({ 
      success: true,
      table,
      message: `Successfully deleted from ${table}`
    });
    
  } catch (error) {
    console.error('💥 Error in manual delete:', error);
    res.status(500).json({ 
      error: 'Failed to delete data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get demo data by email
router.get('/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('demo_comment_sets')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'No demo data found for this email' });
    }

    // Return the demo data
    res.json(data.demo_data);
  } catch (error) {
    console.error('Demo data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch demo data' });
  }
});

// Create or update demo data (for admin use)
router.post('/', async (req, res) => {
  try {
    const { email, channel_id, channel_name, demo_data } = req.body;
    
    if (!email || !demo_data) {
      return res.status(400).json({ error: 'Email and demo_data are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('demo_comment_sets')
      .upsert({
        email,
        channel_id,
        channel_name,
        demo_data
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Demo data creation error:', error);
    res.status(500).json({ error: 'Failed to create demo data' });
  }
});

// Wipe user data for testing
router.post('/wipe-users', async (req, res) => {
  try {
    console.log('🧹 Starting user data wipe...');
    
    // Delete user_platforms records
    const { error: platformsError } = await supabaseAdmin
      .from('user_platforms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (platformsError) {
      console.error('Error deleting user_platforms:', platformsError);
    } else {
      console.log('✅ Deleted all user_platforms records');
    }

    // Delete videos (cascade will handle comments)
    const { error: videosError } = await supabaseAdmin
      .from('videos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (videosError) {
      console.error('Error deleting videos:', videosError);
    } else {
      console.log('✅ Deleted all videos');
    }

    // Delete comments
    const { error: commentsError } = await supabaseAdmin
      .from('comments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (commentsError) {
      console.error('Error deleting comments:', commentsError);
    } else {
      console.log('✅ Deleted all comments');
    }

    // Delete analysis jobs
    const { error: jobsError } = await supabaseAdmin
      .from('analysis_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (jobsError) {
      console.error('Error deleting analysis_jobs:', jobsError);
    } else {
      console.log('✅ Deleted all analysis jobs');
    }

    // Delete user settings
    const { error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (settingsError) {
      console.error('Error deleting user_settings:', settingsError);
    } else {
      console.log('✅ Deleted all user settings');
    }

    // Delete weekly digests
    const { error: digestsError } = await supabaseAdmin
      .from('weekly_digests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (digestsError) {
      console.error('Error deleting weekly_digests:', digestsError);
    } else {
      console.log('✅ Deleted all weekly digests');
    }

    // Delete profiles
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (profilesError) {
      console.error('Error deleting profiles:', profilesError);
    } else {
      console.log('✅ Deleted all user profiles');
    }

    // Delete demo comment sets
    const { error: demoError } = await supabaseAdmin
      .from('demo_comment_sets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (demoError) {
      console.error('Error deleting demo_comment_sets:', demoError);
    } else {
      console.log('✅ Deleted all demo comment sets');
    }

    console.log('🎉 User data wipe completed successfully!');
    
    res.json({ 
      success: true, 
      message: 'All user data has been wiped successfully',
      note: 'Users are still in auth.users table. Sign out and sign in again to test the new token system.'
    });
    
  } catch (error) {
    console.error('💥 Error during user data wipe:', error);
    res.status(500).json({ 
      error: 'Failed to wipe user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List all auth users
router.get('/list-users', async (req, res) => {
  try {
    console.log('🔍 Listing all auth users...');
    
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return res.status(500).json({ error: 'Failed to list users', details: error.message });
    }

    const userList = users.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      providers: user.app_metadata?.providers || []
    }));

    console.log(`✅ Found ${userList.length} users`);
    
    res.json({ 
      users: userList,
      total: userList.length
    });
    
  } catch (error) {
    console.error('💥 Error listing users:', error);
    res.status(500).json({ 
      error: 'Failed to list users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a specific auth user
router.delete('/delete-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🗑️ Deleting auth user:', userId);
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }

    console.log('✅ Successfully deleted auth user:', userId);
    
    res.json({ 
      success: true,
      message: `User ${userId} deleted successfully`
    });
    
  } catch (error) {
    console.error('💥 Error deleting user:', error);
    res.status(500).json({ 
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete all auth users
router.delete('/delete-all-users', async (req, res) => {
  try {
    console.log('🗑️ Deleting all auth users...');
    
    // First, list all users
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to list users', details: listError.message });
    }

    console.log(`Found ${users.users.length} users to delete`);

    // Delete each user
    const deletePromises = users.users.map(async (user) => {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`Error deleting user ${user.id}:`, error);
        return { userId: user.id, success: false, error: error.message };
      }
      console.log(`✅ Deleted user: ${user.id} (${user.email})`);
      return { userId: user.id, success: true };
    });

    const results = await Promise.all(deletePromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`🎉 Deleted ${successful} users successfully, ${failed} failed`);
    
    res.json({ 
      success: true,
      message: `Deleted ${successful} users successfully`,
      results: results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    });
    
  } catch (error) {
    console.error('💥 Error deleting all users:', error);
    res.status(500).json({ 
      error: 'Failed to delete all users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Manual database operations
router.post('/db-insert', async (req, res) => {
  try {
    const { table, data } = req.body;
    
    if (!table || !data) {
      return res.status(400).json({ error: 'Missing table or data parameter' });
    }

    console.log(`📝 Inserting into ${table}:`, data);
    
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select();

    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      return res.status(500).json({ error: `Failed to insert into ${table}`, details: error.message });
    }

    console.log(`✅ Successfully inserted into ${table}:`, result);
    
    res.json({ 
      success: true,
      table,
      data: result
    });
    
  } catch (error) {
    console.error('💥 Error in manual insert:', error);
    res.status(500).json({ 
      error: 'Failed to insert data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/db-select/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const select = req.query.select as string || '*';
    const where = req.query.where as string;
    
    console.log(`🔍 Selecting from ${table} with select: ${select}`);
    
    let query = supabaseAdmin.from(table).select(select);
    
    if (where) {
      try {
        const whereClause = JSON.parse(where) as Record<string, any>;
        Object.entries(whereClause).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      } catch (parseError) {
        console.error('Error parsing where clause:', parseError);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error selecting from ${table}:`, error);
      return res.status(500).json({ error: `Failed to select from ${table}`, details: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} records in ${table}`);
    
    res.json({ 
      success: true,
      table,
      count: data?.length || 0,
      data
    });
    
  } catch (error) {
    console.error('💥 Error in manual select:', error);
    res.status(500).json({ 
      error: 'Failed to select data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/db-delete/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { where } = req.query;
    
    console.log(`🗑️ Deleting from ${table}`);
    
    let query = supabaseAdmin.from(table).delete();
    
    if (where) {
      try {
        const whereClause = JSON.parse(where as string) as Record<string, any>;
        Object.entries(whereClause).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      } catch (parseError) {
        console.error('Error parsing where clause:', parseError);
      }
    }

    const { error } = await query;

    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      return res.status(500).json({ error: `Failed to delete from ${table}`, details: error.message });
    }

    console.log(`✅ Successfully deleted from ${table}`);
    
    res.json({ 
      success: true,
      table,
      message: `Successfully deleted from ${table}`
    });
    
  } catch (error) {
    console.error('💥 Error in manual delete:', error);
    res.status(500).json({ 
      error: 'Failed to delete data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 