// SIMPLIFIED saveBusiness function - removes all complex retry logic
// This version is much cleaner and easier to maintain

const saveBusiness = async (newBusiness: BusinessProfile) => {
  if (!userId) throw new Error('User not authenticated');

  try {
    // STEP 1: Get authenticated user ID (simple, single attempt)
    console.log('🔐 Getting authenticated user ID...');
    
    let authUserId: string | null = null;
    
    // Try session first (most reliable)
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      authUserId = sessionData.session.user.id;
    } else if (authUser?.id) {
      // Fallback to context
      authUserId = authUser.id;
    }
    
    if (!authUserId) {
      throw new Error('Unable to verify your session. Please sign out and sign in again.');
    }

    console.log('✅ Authenticated user ID:', authUserId);

    // STEP 2: Prepare business data
    const businessData = {
      p_user_id: authUserId,
      p_name: newBusiness.name,
      p_type: newBusiness.type,
      p_stage: newBusiness.stage,
      p_location: newBusiness.location,
      p_capital: newBusiness.capital,
      p_currency: newBusiness.currency,
      p_owner: newBusiness.owner,
      p_phone: newBusiness.phone || null,
      p_email: newBusiness.email || null,
      p_address: newBusiness.address || null,
      p_dream_big_book: newBusiness.dreamBigBook || 'none',
      p_logo: newBusiness.logo || null,
    };

    // STEP 3: Call RPC function (handles everything automatically)
    console.log('📤 Creating/updating business profile via RPC...');
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_or_update_business_profile', businessData);

    if (rpcError) {
      console.error('❌ RPC function failed:', rpcError);
      
      // Provide helpful error messages
      if (rpcError.code === '42883' || rpcError.message?.includes('does not exist')) {
        throw new Error(
          'Database function not found. Please run database/create_business_profile_rpc_FINAL.sql in Supabase SQL Editor.'
        );
      }
      
      throw new Error(rpcError.message || 'Failed to save business profile');
    }

    if (!rpcData) {
      throw new Error('No data returned from database');
    }

    // STEP 4: Process result and update state
    const businessResult = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
    
    const savedBusiness: BusinessProfile = {
      id: businessResult.id,
      name: businessResult.name,
      type: businessResult.type as any,
      stage: businessResult.stage as any,
      location: businessResult.location,
      capital: Number(businessResult.capital),
      currency: businessResult.currency as any,
      owner: businessResult.owner,
      phone: businessResult.phone || undefined,
      email: businessResult.email || undefined,
      address: businessResult.address || undefined,
      dreamBigBook: businessResult.dream_big_book || businessResult.dreamBigBook || 'none' as any,
      createdAt: businessResult.created_at || businessResult.createdAt,
    };

    setBusiness(savedBusiness);
    setHasOnboarded(true);
    
    console.log('✅ Business profile saved successfully!');
    return savedBusiness;
    
  } catch (error: any) {
    console.error('❌ Failed to save business profile:', error);
    throw error;
  }
};

