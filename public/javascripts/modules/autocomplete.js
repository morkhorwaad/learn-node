function autocomplete(input, latInput, lngInput) {
    if(!input) return;

    // wire up the autocomplete
    const dropdown = new google.maps.places.Autocomplete(input);
    
    // populate the lat and lng on place changing
    dropdown.addListener('place_changed', () => {
        const place = dropdown.getPlace();
        latInput.value = place.geometry.location.lat();
        lngInput.value = place.geometry.location.lng();
    });

    // prevent form submit on location confirmation
    input.on('keydown', (e) => {
        if(e.keyCode === 13) {
            e.preventDefault();
        }
    });
}

export default autocomplete;