import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(e) {
  e.preventDefault();

  axios
    .post(this.action)
    .then(res => {
      const isHearted = this.heart.classList.toggle('heart__button--hearted'); // references the name property of the thing inside the form (button!)
      $('.heart-count').textContent = res.data.hearts.length;
      if(isHearted) {
        this.heart.classList.add('heart__button--float');
        setTimeout(() => this.classList.remove('heart__button--float'), 2500)
      }
    })
    .catch(console.error);
}

export default ajaxHeart;