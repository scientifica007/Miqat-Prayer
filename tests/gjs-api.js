// Optional introspection only; never construct an actor or connect to Shell.
import St from 'gi://St';
import Clutter from 'gi://Clutter';
if (typeof St.Widget.prototype.set_text_direction !== 'function' ||
    typeof Clutter.TextDirection.RTL !== 'number')
    throw new Error('Required text direction API missing');
print('St/Clutter direction API available; GUI not exercised.');
