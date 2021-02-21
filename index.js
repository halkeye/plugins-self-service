const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const path = require('path');
app.set('env', process.env.NODE_ENV || 'development');
app.use(cors());
app.use(express.static('public'));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});
if (app.get('env') === 'development') {
  const rollup  = require('express-middleware-rollup');
  app.use(rollup({
    debug: true,
    src: 'src',
    dest: 'public',
    root: __dirname,
  }));
}
app.listen(port, () => {
   console.log(`Server is up at port ${port}`);
});


