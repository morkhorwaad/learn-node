import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHtml(stores) {
  return stores.map(store => {
    return `
      <a href="/stores/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
      </a>
    `;
  }).join('');
}

function typeAhead(search) {
  if(!search) return;
  
  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function() {
    if(!this.value) {
      searchResults.style.display = 'none';
      return;
    }

    searchResults.style.display = 'block';

    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if(res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(searchResultsHtml(res.data));
          return;
        }

        // tell them nothing came back
        searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for ${this.value} found.`);
      })
      .catch(err => {
        console.error(err);
      });
  });

  //handle keyboard inputs
  searchInput.on('keyup', e => {
    // 40 = down
    // 38 = up 
    // 13 = enter
    if(![13, 38, 40].includes(e.keyCode)) {
      return;
    }

    const current = searchResults.querySelector(".search__result--active");
    if(current) {
      current.classList.remove('search__result--active');
    }
    
    if(e.keyCode == 13) {
      if(!current) return;
      window.location = current.href;
      return;
    }

    const index = current ? [...searchResults.children].indexOf(current) : -1

    // the one that's selected should be search__result search__result--active
    switch(e.keyCode) {
      case 38:
        var newIndex = index - 1 >= 0 ? index - 1 : searchResults.children.length - 1;
        break;
      case 40:
        var newIndex = index + 1 == searchResults.children.length ? 0 : index + 1;
        break;
    }

    searchResults.children[newIndex].classList.add('search__result--active');
  });
}

export default typeAhead;