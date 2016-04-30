setTimeout(() => console.log('timeout error', 1), 1000);
setTimeout(() => {
    console.log('timeout error', 2200);
    throw new Error('OOPS');
}, 2200);
