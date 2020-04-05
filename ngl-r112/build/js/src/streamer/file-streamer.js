/**
 * @file File Streamer
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import Streamer from './streamer';
class FileStreamer extends Streamer {
    _read() {
        return new Promise((resolve, reject) => {
            const file = this.src;
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target)
                    resolve(event.target.result);
            };
            // if (typeof this.onprogress === 'function') {
            //   reader.onprogress = event => this.onprogress(event)
            // }
            reader.onerror = event => reject(event);
            if (this.binary || this.compressed) {
                reader.readAsArrayBuffer(file);
            }
            else {
                reader.readAsText(file);
            }
        });
    }
}
export default FileStreamer;
