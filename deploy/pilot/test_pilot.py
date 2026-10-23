"""Read-only guard/contract tests: no root operations, DB connections or Docker required."""
import importlib.util,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('origin_pilot',Path(__file__).with_name('pilot.py'))
pilot=importlib.util.module_from_spec(spec);spec.loader.exec_module(pilot)
class PilotGuards(unittest.TestCase):
    def test_database_target_is_exact_loopback_role_and_recognized_name(self):
        cfg={'DATABASE_URL':'postgresql://origin_pilot:secret@127.0.0.1:5432/origin_pilot?schema=public'}
        env=pilot.pg_env(cfg);self.assertEqual(env['PGDATABASE'],'origin_pilot');self.assertEqual(env['PGPASSWORD'],'secret')
        for url in ['postgresql://origin_pilot@20.205.63.170/origin_pilot','postgresql://postgres@127.0.0.1/origin_pilot','postgresql://origin_pilot@127.0.0.1/presentation','postgresql://origin_pilot@127.0.0.1:55500/origin_pilot']:
            with self.assertRaises(RuntimeError):pilot.pg_env({'DATABASE_URL':url})
    def test_connected_identity_is_attested_before_any_operation(self):
        env={'PGDATABASE':'origin_pilot'}
        with patch.object(pilot,'sql',return_value='other|origin_pilot|127.0.0.1|5432'):
            with self.assertRaises(RuntimeError):pilot.identity(env)
    def test_backup_checksums_detect_tampering(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory).resolve();backup=root/'backup-one';backup.mkdir()
            for n in ['database.dump','git-storage.tar','pilot.env']:(backup/n).write_text('synthetic-'+n)
            m={'version':1,'files':{n:pilot.digest(backup/n) for n in ['database.dump','git-storage.tar','pilot.env']}}
            (backup/'manifest.json').write_text(json.dumps(m));(backup/'manifest.sha256').write_text(pilot.digest(backup/'manifest.json'))
            with patch.object(pilot,'BACKUPS',root):
                self.assertEqual(pilot.checked_backup(backup)[1],m)
                (backup/'database.dump').write_text('changed')
                with self.assertRaises(RuntimeError):pilot.checked_backup(backup)
    def test_storage_links_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'file').write_text('test');pilot.tree_safe(root)
            (root/'link').symlink_to('/etc')
            with self.assertRaises(RuntimeError):pilot.tree_safe(root)
    def test_activation_refuses_unknown_or_incomplete_release(self):
        with tempfile.TemporaryDirectory() as directory,patch.object(pilot,'BASE',Path(directory)):
            with self.assertRaises(RuntimeError):pilot.activate('main')
            with self.assertRaises(RuntimeError):pilot.activate('a'*40)
    def test_row_fingerprints_are_deterministic_and_do_not_print_rows(self):
        with patch.object(pilot,'sql',side_effect=['users','synthetic-hash']) as query:
            self.assertEqual(pilot.fingerprints({}),{'users':'synthetic-hash'})
            self.assertIn("),'')) FROM",query.call_args.args[1])
            self.assertIn('ORDER BY row_to_json',query.call_args.args[1])
    def test_templates_keep_untrusted_java_offline_and_api_without_docker(self):
        root=Path(__file__).parent
        env=(root/'pilot.env.example').read_text();self.assertIn('JAVA_EXECUTION_MODE=container',env);self.assertIn('GIT_EXECUTION_MODE=service_isolated',env);self.assertIn('AUTH_COOKIE_SECURE=true',env)
        for name in ['api','git','java','verify-java']:
            unit=(root/'systemd'/f'origin-{name}.service').read_text()
            self.assertIn('ProtectSystem=strict',unit);self.assertIn('NoNewPrivileges=yes',unit);self.assertNotIn('User=root',unit)
            self.assertEqual('SupplementaryGroups=docker' in unit,name in ['java','verify-java'])
        self.assertIn('deny all;',(root/'nginx/pilot-access.conf.example').read_text())
if __name__=='__main__':unittest.main()
