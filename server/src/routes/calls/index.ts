import { Router, Request, Response } from 'express';
import { supabase } from '../../services/supabase';
import type { ApiResponse, Call } from '../../../../shared/types';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { client_id, limit = '50', page = '1' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  let query = supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  const { data, error, count } = await query;

  if (error) {
    res.status(500).json({ success: false, error: error.message } satisfies ApiResponse);
    return;
  }

  res.json({
    success: true,
    data,
    meta: { total: count ?? 0, page: pageNum, limit: limitNum },
  } satisfies ApiResponse<Call[]>);
});

router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ success: false, error: 'Call not found' } satisfies ApiResponse);
    return;
  }

  res.json({ success: true, data } satisfies ApiResponse<Call>);
});

export default router;
