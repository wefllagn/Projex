import type { JavaRunner } from './java-runner.js'
import { JavaInfrastructureError } from './java-infrastructure-error.js'
export const isolationProbeSource = String.raw`
import java.nio.file.*;
import java.net.*;
import java.util.*;
public class Main {
  static void need(boolean value) { if(!value) throw new IllegalStateException("BOUNDARY_FAILED"); }
  public static void main(String[] args) throws Exception {
    String mode=new Scanner(System.in).nextLine();
    if(mode.equals("boundaries")) {
      String status=Files.readString(Path.of("/proc/self/status"));
      need(status.matches("(?s).*Uid:\\s+[1-9][0-9]*.*"));
      need(status.matches("(?s).*NoNewPrivs:\\s+1.*"));
      need(status.matches("(?s).*Seccomp:\\s+2.*"));
      need(status.matches("(?s).*CapEff:\\s+0+\\n.*"));
      need(Files.readString(Path.of("/proc/self/attr/current")).trim().equals("docker-default (enforce)"));
      need(Files.readString(Path.of("/sys/fs/cgroup/memory.max")).trim().equals("268435456"));
      need(Files.readString(Path.of("/sys/fs/cgroup/pids.max")).trim().equals("64"));
      String[] cpu=Files.readString(Path.of("/sys/fs/cgroup/cpu.max")).trim().split(" ");
      need(!cpu[0].equals("max") && Long.parseLong(cpu[0])==Long.parseLong(cpu[1]));
      for(String secret:new String[]{"DATABASE_URL","ACCESS_TOKEN_SECRET","GIT_STORAGE_ROOT","DOCKER_HOST"}) need(System.getenv(secret)==null);
      need(!Files.exists(Path.of("/var/run/docker.sock")) && !Files.exists(Path.of("/etc/origin")) && !Files.exists(Path.of("/opt/origin")));
      try { Files.writeString(Path.of("/etc/origin-write-probe"),"blocked"); throw new IllegalStateException(); } catch(java.io.IOException expected) {}
      try { Files.writeString(Path.of("/work/runtime-write-probe"),"blocked"); throw new IllegalStateException(); } catch(java.io.IOException expected) {}
      try(Socket socket=new Socket()) { socket.connect(new InetSocketAddress("1.1.1.1",443),300); throw new IllegalStateException(); } catch(java.io.IOException expected) {}
      System.out.println("ISOLATED");
    } else if(mode.equals("memory")) {
      try { List<byte[]> data=new ArrayList<>(); while(true) data.add(new byte[8*1024*1024]); } catch(OutOfMemoryError bounded) { System.out.println("MEMORY_BOUNDED"); }
    } else if(mode.equals("disk")) {
      try { byte[] bytes=new byte[1024*1024]; for(int i=0;i<40;i++) Files.write(Path.of("/tmp/disk-probe-"+i),bytes); throw new IllegalStateException(); } catch(java.io.IOException bounded) { System.out.println("DISK_BOUNDED"); }
    } else if(mode.equals("pids")) {
      List<Process> children=new ArrayList<>(); boolean bounded=false;
      try { for(int i=0;i<100;i++) children.add(new ProcessBuilder("sleep","20").start()); } catch(java.io.IOException | OutOfMemoryError expected) { bounded=true; }
      finally { for(Process child:children) child.destroyForcibly(); }
      need(bounded); System.out.println("PIDS_BOUNDED");
    } else if(mode.equals("timeout")) { while(true) Thread.onSpinWait(); }
    else if(mode.equals("output")) { while(true) System.out.println("OUTPUT_LIMIT_PROBE_0123456789"); }
  }
}
`
export async function verifyJavaContainerBoundaries(runner: JavaRunner, full = false) {
  const probes = [{ id: 'boundaries', expectedOutput: 'ISOLATED' }, ...(full ? [{ id: 'memory', expectedOutput: 'MEMORY_BOUNDED' }, { id: 'disk', expectedOutput: 'DISK_BOUNDED' }, { id: 'pids', expectedOutput: 'PIDS_BOUNDED' }, { id: 'timeout', expectedOutput: '' }, { id: 'output', expectedOutput: '' }] : [])]
  // JVM process-reaper thread warnings can accompany the deliberately exhausted PID quota.
  const result = await runner.execute({ sourceCode: isolationProbeSource, entryClassName: 'Main', cases: probes.map(row => ({ ...row, input: row.id + '\n', compareOutput: row.id !== 'pids' })) })
  if (result.compileStatus !== 'SUCCESS' || result.cases.some(row => row.status !== (row.id === 'timeout' ? 'TIMEOUT' : row.id === 'output' ? 'OUTPUT_LIMIT' : 'PASSED') || (row.id === 'pids' && !row.actualOutput?.trim().endsWith('PIDS_BOUNDED')))) throw new JavaInfrastructureError('JAVA_CONTAINER_BOUNDARY_VERIFICATION_FAILED')
  return result.cases.map(row => ({ check: row.id, status: 'PASS' as const }))
}
