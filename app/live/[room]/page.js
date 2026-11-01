'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Room, RoomEvent, Track } from 'livekit-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RegarderLive() {
  const params = useParams();
  const nomRoom = params.room;

  const [session, setSession] = useState(null);
  const [pret, setPret] = useState(false);
  const [titre, setTitre] = useState('');
  const [etat, setEtat] = useState('chargement');
  const [erreur, setErreur] = useState('');
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [sonBloque, setSonBloque] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const roomRef = useRef(null);
  const dejaRejoint = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPret(true);
    });
  }, []);

  useEffect(() => {
    if (!session || !nomRoom || dejaRejoint.current) return;
    dejaRejoint.current = true;
    rejoindre();
    return () => {
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        try {
          room.disconnect();
        } catch (e) {}
      }
    };
  }, [session, nomRoom]);

  async function rejoindre() {
    try {
      const { data: live } = await supabase
        .from('lives')
        .select('titre, en_cours, user_id')
        .eq('room', nomRoom)
        .maybeSingle();

      if (!live || !live.en_cours) {
        setEtat('termine');
        return;
      }
      setTitre(live.titre || 'Live');

      const rep = await fetch('/api/live/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ room: nomRoom, diffuseur: false }),
      });
      const json = await rep.json();
      if (!rep.ok) {
        if (rep.status === 404) {
          setEtat('termine');
          return;
        }
        throw new Error(json.erreur || 'Erreur');
      }

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
        } else if (track.kind === Track.Kind.Audio && audioRef.current) {
          const el = track.attach();
          audioRef.current.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => {
          if (el.tagName === 'AUDIO') el.remove();
        });
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setSonBloque(!room.canPlaybackAudio);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (participant.identity === live.user_id) {
          setEtat('termine');
          try {
            room.disconnect();
          } catch (e) {}
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setEtat('termine');
      });

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          setMessages((m) => [
            ...m.slice(-99),
            { nom: (participant && participant.name) || 'Membre', texte: msg.texte },
          ]);
        } catch (e) {}
      });

      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, json.token);
      setSonBloque(!room.canPlaybackAudio);
      setEtat('direct');
    } catch (e) {
      setErreur(e && e.message ? e.message : 'Impossible de rejoindre le live.');
      setEtat('erreur');
    }
  }

  async function activerSon() {
    const room = roomRef.current;
    if (room) {
      try {
        await room.startAudio();
        setSonBloque(false);
      } catch (e) {}
    }
  }

  async function envoyer(e) {
    e.preventDefault();
    const t = texte.trim();
    const room = roomRef.current;
    if (!t || !room) return;
    const data = new TextEncoder().encode(JSON.stringify({ texte: t.slice(0, 300) }));
    await room.localParticipant.publishData(data, { reliable: true });
    setMessages((m) => [...m.slice(-99), { nom: 'Moi', texte: t.slice(0, 300) }]);
    setTexte('');
  }

  if (!pret) {
    return <div style={{ padding: 20 }}>Chargement…</div>;
  }

  if (!session) {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
        <h2>Live</h2>
        <p>Connecte-toi pour regarder ce live.</p>
        <a href="/login">Se connecter</a>
      </div>
    );
  }

  if (etat === 'termine') {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
        <h2>Ce live est terminé</h2>
        <a href="/">Retour à l'accueil</a>
      </div>
    );
  }

  if (etat === 'erreur') {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
        <h2>Impossible de rejoindre le live</h2>
        <p style={{ color: '#e11d48' }}>{erreur}</p>
        <a href="/">Retour à l'accueil</a>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>🔴 {titre || 'Live'}</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', borderRadius: 12, background: '#000', minHeight: 200 }}
      />
      <div ref={audioRef} style={{ display: 'none' }} />

      {etat === 'chargement' && <p>Connexion au live…</p>}

      {sonBloque && etat === 'direct' && (
        <button
          onClick={activerSon}
          style={{
            width: '100%',
            marginTop: 10,
            padding: 12,
            borderRadius: 8,
            border: 'none',
            background: '#e11d48',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔊 Activer le son
        </button>
      )}

      {etat === 'direct' && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              border: '1px solid #999',
              borderRadius: 8,
              padding: 8,
              height: 160,
              overflowY: 'auto',
              marginBottom: 8,
            }}
          >
            {messages.length === 0 && (
              <span style={{ opacity: 0.6 }}>Écris le premier message !</span>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                <strong>{m.nom} :</strong> {m.texte}
              </div>
            ))}
          </div>

          <form onSubmit={envoyer} style={{ display: 'flex', gap: 8 }}>
            <input
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Écrire un message…"
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #999',
              }}
            />
            <button type="submit" style={{ padding: '10px 14px', borderRadius: 8 }}>
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
