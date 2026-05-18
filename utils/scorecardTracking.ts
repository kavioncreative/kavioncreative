import { supabase } from '../lib/supabase';

/**
 * Tracks a user action for the Scorecard system.
 * 
 * @param userId - The ID of the user performing the action.
 * @param actionType - The type of action (e.g., 'comment', 'status_change', 'file_sent').
 * @param referenceId - Optional. The ID of the related project, task, or message.
 * @returns The inserted submission record, or null if an error occurred.
 */
export const trackUserAction = async (userId: string, actionType: string, referenceId?: string) => {
    try {
        // 1. Fetch matching rule from the rules table
        const { data: rule, error: ruleError } = await supabase
            .from('scorecard_rules')
            .select('*')
            .eq('action_type', actionType)
            .single();

        // It's okay if a rule isn't found (maybe no rule is defined for this action yet)
        if (ruleError && ruleError.code !== 'PGRST116') {
            console.error('Error fetching scorecard rule:', ruleError);
        }

        const categoryId = rule ? rule.category_id : null;
        const points = rule ? rule.weight : 0;

        // Check for "One Project = One Count per day" logic for 'comment'
        if (actionType === 'comment' && referenceId) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { data: existingAction, error: checkError } = await supabase
                .from('scorecard_submissions')
                .select('id')
                .eq('user_id', userId)
                .eq('action_type', actionType)
                .eq('reference_id', referenceId)
                .gte('created_at', startOfDay.toISOString())
                .limit(1);

            if (checkError) {
                console.error('Error checking existing submission:', checkError);
            }

            if (existingAction && existingAction.length > 0) {
                console.log(`[Scorecard] Duplicate action prevented (One per day/project): ${actionType} for User: ${userId} on Project: ${referenceId}`);
                return null; // Already counted today, skip logging
            }
        }

        // 2. Insert into scorecard_submissions
        const payload = {
            user_id: userId,
            action_type: actionType,
            category_id: categoryId,
            points: points,
            reference_id: referenceId || null
        };

        const { data: submission, error: submitError } = await supabase
            .from('scorecard_submissions')
            .insert([payload])
            .select()
            .single();

        if (submitError) {
            console.error('Error recording scorecard submission:', submitError);
            return null;
        }

        console.log(`[Scorecard] Action tracked: ${actionType} for User: ${userId} | Points: +${points}`);
        return submission;

    } catch (error) {
        console.error('Unexpected error in trackUserAction:', error);
        return null;
    }
};
