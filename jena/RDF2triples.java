import org.apache.jena.rdf.model.Model ;
import org.apache.jena.rdf.model.ModelFactory ;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.StmtIterator;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.rdf.model.impl.StmtIteratorImpl;
import java.util.*;
import java.io.FileWriter;
import java.io.IOException;



public class rdf2triples
{
    public static void main(String[] args) {
		
  
	
        Model m = ModelFactory.createDefaultModel() ;
        // read into the model.
		String fileName=args[0];
        m.read(fileName);//,"http://xxx.org") ;
	
		
 StmtIterator sIter = m.listStatements();
 String str="";
 int i=0;

 ArrayList<List> allLines = new ArrayList<List>();
 while (sIter.hasNext()){
	 Statement statement =sIter.next();
	 if(i++>0)
		// str+=".\n" ;
		str+=",\n" ;
	String objectStr="";
	RDFNode objectNode=statement.getObject();
	
	if(objectNode.isResource())
		objectStr="<"+objectNode.toString()+">";
	else
		objectStr="'"+objectNode.toString().replaceAll("'","")+"'";
		objectStr=objectStr.replaceAll("\n","");
		objectStr=objectStr.replaceAll("\r","");
		objectStr=objectStr.replaceAll("\"","");
		objectStr=objectStr.replaceAll("\\\\","");


		ArrayList<String> line = new ArrayList<String>();
		line.add("\"<"+statement.getSubject().toString()+">\"");
		line.add("\"<"+statement.getPredicate().toString()+">\"");
		line.add("\""+objectStr+"\"");

allLines.add(line);

	//str+=("<"+statement.getSubject().toString()+">\t<"+statement.getPredicate().toString()+">\t"+objectStr+"");
		//str+=("[\""+statement.getSubject().toString()+"\",\""+statement.getPredicate().toString()+"\",\""+statement.getObject()+"\"]");
	 
 }

 System.out.println(allLines.toString());
//System.out.println("["+str+"]");
 
 return;
 
 

}
}