
declare var $: any;

$.ready((error) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log("Hello");

});
$.end(() => {
    console.log("Ruff APP end");
});
