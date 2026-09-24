import { getSupabaseClient, getUser, isConfigured } from './supabase.js';

const list = document.querySelector('#commentsList');
const form = document.querySelector('#commentForm');
const status = document.querySelector('#commentStatus');
const symbol = new URLSearchParams(location.search).get('symbol')?.trim();
let client;
const setStatus = (message, error = false) => { status.textContent = message; status.classList.toggle('calc-error', error); };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

async function renderComments() {
  if (!client) return;
  const { data, error } = await client.from('comments').select('*').eq('element_symbol', symbol).is('parent_id', null).order('created_at', { ascending: false }).limit(20);
  if (error) return setStatus(error.message, true);
  list.innerHTML = data.length ? data.map((comment) => `<article class="comment"><p>${escapeHtml(comment.body)}</p><small>${new Date(comment.created_at).toLocaleString()}</small><button class="button secondary comment-report" data-id="${comment.id}" type="button">Report</button>${comment.user_id === window.currentChemUser?.id ? `<button class="button secondary comment-delete" data-id="${comment.id}" type="button">Delete</button>` : ''}</article>`).join('') : '<p>No comments yet.</p>';
  list.querySelectorAll('.comment-delete').forEach((button) => button.addEventListener('click', async () => { await client.from('comments').delete().eq('id', button.dataset.id); renderComments(); }));
  list.querySelectorAll('.comment-report').forEach((button) => button.addEventListener('click', async () => { if (!window.currentChemUser) return setStatus('Sign in to report a comment.', true); const { error } = await client.from('reports').insert({ comment_id: button.dataset.id, user_id: window.currentChemUser.id, reason: 'User report' }); setStatus(error ? error.message : 'Report submitted.', Boolean(error)); }));
}

async function init() {
  if (!isConfigured()) { form.hidden = true; return setStatus('Discussion is available after Supabase configuration.'); }
  client = await getSupabaseClient();
  window.currentChemUser = await getUser();
  if (!window.currentChemUser) { form.hidden = true; setStatus('Sign in to comment.'); }
  else form.hidden = false;
  form.addEventListener('submit', async (event) => { event.preventDefault(); const body = document.querySelector('#commentBody').value.trim(); if (!body || body.length > 2000) return setStatus('Comment must be 1-2000 characters.', true); const { error } = await client.from('comments').insert({ user_id: window.currentChemUser.id, element_symbol: symbol, body }); if (error) return setStatus(error.message, true); document.querySelector('#commentBody').value = ''; renderComments(); });
  await renderComments();
  client.channel(`comments:${symbol}`).on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `element_symbol=eq.${symbol}` }, renderComments).subscribe();
}
init().catch((error) => setStatus(error.message, true));
