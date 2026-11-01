import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const entete = request.headers.get('authorization') || '';
    const jwt = entete.replace('Bearer ', '').trim();
    if (!jwt) {
      return Response.json({ erreur: 'Non connecté' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(url, cle, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: dataUser, error: errUser } = await supabase.auth.getUser(jwt);
    const user = dataUser && dataUser.user;
    if (errUser || !user) {
      return Response.json({ erreur: 'Session invalide' }, { status: 401 });
    }

    const { room, diffuseur } = await request.json();
    if (!room) {
      return Response.json({ erreur: 'Salon manquant' }, { status: 400 });
    }

    const { data: live } = await supabase
      .from('lives')
      .select('id, user_id, en_cours')
      .eq('room', room)
      .maybeSingle();

    if (!live || !live.en_cours) {
      return Response.json({ erreur: 'Ce live est terminé' }, { status: 404 });
    }

    const estDiffuseur = Boolean(diffuseur) && live.user_id === user.id;
    if (diffuseur && !estDiffuseur) {
      return Response.json({ erreur: 'Interdit' }, { status: 403 });
    }

    const meta = user.user_metadata || {};
    const nom = meta.nom || meta.full_name || meta.name || 'Membre';

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity: user.id, name: nom, ttl: '4h' }
    );
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: estDiffuseur,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return Response.json({ token });
  } catch (e) {
    return Response.json({ erreur: 'Erreur serveur' }, { status: 500 });
  }
}
