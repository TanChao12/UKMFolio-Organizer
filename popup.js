document.querySelector('#open').addEventListener('click',()=>chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')}));
document.querySelector('#sync').addEventListener('click',()=>chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html?sync=1')}));
