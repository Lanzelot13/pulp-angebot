export default function Home() {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 600,
      margin: '100px auto',
      padding: '0 20px',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 8 }}>
        PUL<span style={{ color: '#FF1900' }}>p</span> ange
        <span style={{ color: '#FF1900' }}>BOT</span>
      </h1>
      <p style={{ color: '#888', fontSize: 16 }}>
        Pulpmedia Angebots-Tool · API läuft
      </p>
    </div>
  )
}
