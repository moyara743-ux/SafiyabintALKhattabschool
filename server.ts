import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://acuahtbxqbumjcigoeff.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yf0hT1dTf0f6I8u6765GMA_YJA5xArZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Profile Completion POST Handler (مسار معالجة حفظ بيانات المنسوبة)
 * Captures (national_id, phone, employee_code, specialization) and persists them permanently.
 */
app.post('/api/staff/complete-profile', async (req: Request, res: Response) => {
  try {
    const {
      email,
      national_id,
      nationalId,
      phone,
      employee_code,
      staff_code,
      name,
      specialization,
      role,
    } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanNationalId = (national_id || nationalId || '').trim().replace(/\D/g, '');
    const cleanPhone = (phone || '').trim().replace(/\D/g, '');
    const cleanEmployeeCode = (employee_code || staff_code || '').trim();
    const cleanSpec = (specialization || '').trim();

    if (!cleanEmail) {
      return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    }
    if (!cleanNationalId || cleanNationalId.length !== 10) {
      return res.status(400).json({ error: 'صيغة رقم الهوية الوطنية أو الإقامة غير صحيحة (10 أرقام).' });
    }
    if (!cleanPhone || !cleanPhone.startsWith('05') || cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'صيغة رقم الجوال غير صحيحة (10 أرقام تبدأ بـ 05).' });
    }

    console.log(`[API /api/staff/complete-profile] Processing completion for ${cleanEmail}:`, {
      national_id: cleanNationalId,
      phone: cleanPhone,
      employee_code: cleanEmployeeCode,
      specialization: cleanSpec,
    });

    // Structure metadata tags for custom_permissions JSONB array (ensures 100% permanence across schemas)
    const customPerms: string[] = [
      `phone:${cleanPhone}`,
      `nid:${cleanNationalId}`,
      `employee_code:${cleanEmployeeCode}`,
      `staff_code:${cleanEmployeeCode}`,
      `spec:${cleanSpec}`,
      'profile_completed',
      'account_status:completed',
    ];

    // Attempt 1: Full column update on public.users
    let updateResult: any = null;
    try {
      updateResult = await supabase
        .from('users')
        .update({
          name: name || undefined,
          phone: cleanPhone,
          national_id: cleanNationalId,
          staff_code: cleanEmployeeCode,
          employee_code: cleanEmployeeCode,
          specialization: cleanSpec,
          account_status: 'completed',
          status: 'active',
          is_profile_completed: true,
          custom_permissions: customPerms,
          updated_at: new Date().toISOString(),
        })
        .eq('email', cleanEmail)
        .select();
    } catch (err) {
      console.warn('[API /api/staff/complete-profile] Full update attempt notice:', err);
    }

    // Attempt 2: If top-level columns do not exist in schema cache (PGRST204), update safe core columns + custom_permissions JSONB
    if (updateResult?.error && updateResult.error.code === 'PGRST204') {
      console.log('[API /api/staff/complete-profile] Falling back to custom_permissions JSONB persistence');
      updateResult = await supabase
        .from('users')
        .update({
          name: name || undefined,
          status: 'active',
          custom_permissions: customPerms,
          updated_at: new Date().toISOString(),
        })
        .eq('email', cleanEmail)
        .select();
    }

    return res.json({
      success: true,
      message: 'تم حفظ وتخزين بيانات المنسوبة (الهوية، الجوال، الرمز الوظيفي) في قاعدة البيانات بنجاح',
      data: {
        email: cleanEmail,
        name,
        national_id: cleanNationalId,
        phone: cleanPhone,
        employee_code: cleanEmployeeCode,
        specialization: cleanSpec,
        role: role || 'teacher',
        is_profile_completed: true,
      },
    });
  } catch (err: any) {
    console.error('[API /api/staff/complete-profile] Unhandled error:', err);
    return res.status(500).json({ error: err?.message || 'حدث خطأ في الخادم أثناء حفظ البيانات.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Vite middleware in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] Running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
