import os
import zipfile
import datetime

def make_backup():
    base_dir = os.path.abspath("d:/ĐỒ ÁN TỐT NGHIỆP")
    now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"BACKUP_PROJECT_CODE_{now_str}.zip"
    zip_filepath = os.path.join(base_dir, zip_filename)

    exclude_dirs = {'.git', '.pio', '.cache', '.vscode', '__pycache__', 'node_modules'}
    exclude_exts = {'.zip', '.mp4', '.pdf', '.docx', '.tmp'}
    exclude_files = {'compile_commands.json'}

    print(f"Creating backup archive: {zip_filename}...")
    file_count = 0
    with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in exclude_exts or file in exclude_files:
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_dir)
                zipf.write(full_path, rel_path)
                file_count += 1

    file_size_mb = os.path.getsize(zip_filepath) / (1024 * 1024)
    print(f"SUCCESS: Created {zip_filename} with {file_count} files ({file_size_mb:.2f} MB).")
    return zip_filepath

if __name__ == '__main__':
    make_backup()
