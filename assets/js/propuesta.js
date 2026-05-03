// propuesta.js
const FOLDER_URL = 'https://drive.google.com/drive/folders/1K1N25D7S-QR3xK8AlRBODAZryIi30msm?usp=sharing';

document.addEventListener('DOMContentLoaded', () => {
  const toast = document.getElementById('copy-toast');

  function copyLink() {
    navigator.clipboard.writeText(FOLDER_URL).then(() => {
      if (toast) {
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2500);
      }
    }).catch(() => {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = FOLDER_URL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (toast) {
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2500);
      }
    });
  }

  document.getElementById('btn-copy-link')?.addEventListener('click', copyLink);
  document.getElementById('btn-copy-2')?.addEventListener('click', copyLink);
});
