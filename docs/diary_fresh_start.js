(function(){
  var params = new URLSearchParams(window.location.search || '');
  if(params.get('fresh') !== '1') return;

  function removeFreshParam(){
    if(!window.history || !window.history.replaceState) return;
    var next = new URL(window.location.href);
    next.searchParams.delete('fresh');
    window.history.replaceState({}, document.title, next.toString());
  }

  window.addEventListener('DOMContentLoaded', function(){
    var shell = document.querySelector('[data-challenge-day]');
    var day = shell && shell.getAttribute('data-challenge-day');
    if(day && day !== '1') {
      removeFreshParam();
      return;
    }

    Object.keys(localStorage).forEach(function(key){
      var lower = key.toLowerCase();
      var looksLikeDiary = /diary|challenge|manual|moon|tsukiyomi/.test(lower);
      var isSyncSetting = /sheetsync|diarysync:outbox/.test(lower);
      if(looksLikeDiary && !isSyncSetting) {
        localStorage.removeItem(key);
      }
    });

    document.querySelectorAll('textarea, input:not([type="file"])').forEach(function(field){
      field.value = '';
    });
    document.querySelectorAll('[data-save-status], [data-diary-item-preview], [data-moon-diary-status]').forEach(function(el){
      if(el.matches('[data-diary-item-preview]')){
        el.innerHTML = '<span>写真を選ぶと、ここに表示されます。</span>';
      } else {
        el.textContent = '';
      }
    });
    removeFreshParam();
  });
})();
