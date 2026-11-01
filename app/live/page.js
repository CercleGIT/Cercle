'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Room, RoomEvent, Track } from 'livekit-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PageLive() {
  const [session, setSession] = useState(null);
  const [pret, setPret] = useState(false);
  const [titre, setTitre] = useState('');
  const [enDirect, setEnDirect] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [spectateurs, setSpectateurs] = useState(0);
  const [lien, setLien] = useState('');
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const nomRoomRef = useRef('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPret(true);
    });
    const surFermeture = () => {
      arreter();
    };
    window.addEventListener('pagehide', surFermeture);
    return () => {
      window.removeEventListener('pagehide', surFermeture);
      arreter();
    };
  }, []);

  async function arreter() {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        await room.disconnect();
      } catch (e) {}
    }
    const nomRoom = nomRoomRef.current;
    if (nomRoom) {
      nomRoomRef.current = '';
      try {
        await supabase
          .from('lives')
          .update({ en_cours: false, fin: new Date().toISOString() })
          .eq('room', nomRoom);
      } catch (e) {}
    }
    setEnDirect(false);
    setSpectateurs(0);
  }

  async function demarrer() {
    setErreur('');
    setChargement(true);
    try {
      const user = session.user;
      const nomRoom = `live-${user.id.slice(0, 8)}-${Date.now()}`;

      const { error: errInsert } = await supabase.from('lives').insert({
        user_id: user.id,
        titre: titre.trim() || 'Live',
        room: nomRoom,
        en_cours: true,
      });
      if (errInsert) throw new Error('Impossible de créer le live');
      nomRoomRef.current = nomRoom;

      const rep = await fetch('/api/live/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ room: nomRoom, diffuseur: true }),
      });
      const json = await rep.json();
      if (!rep.ok) throw new Error(json.erreur || 'Erreur');

      const room = new Room();
      roomRef.current = room;
      room.on(RoomEvent.ParticipantConnected, () =>
        setSpectateurs(room.remoteParticipants.size)
      );
      room.on(RoomEvent.ParticipantDisconnected, () =>
        setSpectateurs(room.remoteParticipants.size)
      );
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
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);

      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub && pub.track && videoRef.current) {
        pub.track.attach(videoRef.current);
      }

      setLien(`${window.location.origin}/live/${nomRoom}`);
      setEnDirect(true);
    } catch (e) {
      setErreur(
        e && e.message
          ? e.message
          : "Impossible de démarrer. Vérifie que la caméra et le micro sont autorisés."
      );
      await arreter();
    } finally {
      setChargement(false);
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
        <h2>Passer en live</h2>
        <p>Connecte-toi pour faire un live.</p>
        <a href="/login">Se connecter</a>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>Passer en live</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          borderRadius: 12,
          background: '#000',
          display: enDirect ? 'block' : 'none',
        }}
      />

      {!enDirect && (
        <div>
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Titre de ton live (facultatif)"
            maxLength={80}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #999',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
          />
          <button
            onClick={demarrer}
            disabled={chargement}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 8,
              border: 'none',
              background: '#e11d48',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {chargement ? 'Démarrage…' : '🔴 Démarrer le live'}
          </button>
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            Ton navigateur va te demander l'accès à la caméra et au micro : accepte.
          </p>
        </div>
      )}

      {erreur && <p style={{ color: '#e11d48' }}>{erreur}</p>}

      {enDirect && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>🔴 EN DIRECT · {spectateurs} spectateur(s)</strong>
            <button
              onClick={arreter}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#444',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Arrêter
            </button>
          </div>

          <p style={{ fontSize: 13, wordBreak: 'break-all' }}>
            Lien de ton live : <a href={lien}>{lien}</a>
          </p>

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
              <span style={{ opacity: 0.6 }}>Les messages des spectateurs apparaîtront ici.</span>
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
