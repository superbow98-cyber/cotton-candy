{!isEditing && (
                <>
                  <button onClick={startEdit} style={{
                    background: 'transparent', border: '0.5px solid rgba(212, 83, 126, 0.4)',
                    color: '#993556', padding: '3px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}>
                    ✏️ {lang === 'bm' ? 'Edit' : 'Edit'}
                  </button>
                  <label style={{
                    background: 'transparent', border: '0.5px solid rgba(212, 83, 126, 0.4)',
                    color: '#993556', padding: '3px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    opacity: transcriptImages.length >= 5 ? 0.4 : 1,
                  }}>
                    {uploadingImage
                      ? (lang === 'bm' ? '⏳ Uploading...' : '⏳ Uploading...')
                      : `🖼️ ${lang === 'bm' ? 'Tambah gambar' : 'Add image'} (${transcriptImages.length}/5)`}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      disabled={uploadingImage || transcriptImages.length >= 5}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadImage(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </>
              )}
